import { Request, Response, NextFunction } from "express";
import Together from "together-ai";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";

// API key rotation system for rate limit handling
let apiKeyIndex = 0;
let apiKeys: string[] = [];

// Parse API keys from environment variable
if (process.env.TOGETHER_API_KEYS) {
  apiKeys = process.env.TOGETHER_API_KEYS.split(',').map(key => key.trim());
  console.log(`Loaded ${apiKeys.length} Together AI API keys for rotation`);
} else {
  console.warn('No Together AI API keys found in environment variables');
  apiKeys = ["2cb579e0252fc415c53ade6a1ddec2d7d052b9cc40eaca2d58cb7dcc85894672"]; // Fallback key
}

// Get the next API key in rotation
function getNextApiKey(): string {
  const key = apiKeys[apiKeyIndex];
  apiKeyIndex = (apiKeyIndex + 1) % apiKeys.length;
  return key;
}

// Initialize TogetherAI client with key rotation
function getTogetherClient() {
  return new Together({
    apiKey: getNextApiKey(),
  });
}

// Configure multer for storing uploaded images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Only accept PNG, JPEG, and JPG images
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, and JPG image files are allowed"));
    }
  },
});

// Default system prompt
const DEFAULT_SYSTEM_PROMPT = `You are an AI-powered educational assistant for a Learning Management System. 
Help students understand course concepts, explain topics, and answer questions related to their education.
You should focus on educational content and avoid answering questions that are inappropriate or unrelated to learning.
Be thorough, polite, and provide clear explanations with examples when possible.

Feel free to use the <think>...</think> tags to show your reasoning process before giving the final answer. 
Inside the <think> tags, explain your thought process about how you're approaching the question.
Then provide your actual response outside of these tags.

Your responses will be rendered as Markdown, so please use Markdown formatting for:
- Headers (# for main headings, ## for subheadings, etc.)
- **Bold text** for emphasis or important concepts
- *Italic text* for definitions or terms
- Lists (bulleted with - or numbered with 1., 2., etc.)
- Code blocks with triple backticks for code examples and syntax
- Tables when presenting structured data

Code examples should be properly formatted with language-specific syntax highlighting like:

\`\`\`javascript
function example() {
  return "This is a code example";
}
\`\`\`

When explaining programming concepts, use proper code formatting and ensure your explanations are clear and educational.`;

export async function chatWithAI(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { messages, courseContext } = req.body;

    // Add course context if provided
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (courseContext) {
      systemPrompt += `\n\nYou are currently helping with the course: ${courseContext.title}.\n`;
      if (courseContext.description) {
        systemPrompt += `Course description: ${courseContext.description}\n`;
      }
    }

    // Check if any messages contain images
    const hasImages = messages.some((msg: any) => msg.image);

    // If there are messages with images, we need to use the vision model
    if (hasImages) {
      // Format messages for the vision model
      const formattedVisionMessages: any[] = [
        { role: "system", content: systemPrompt },
      ];

      // Process each message and format properly for the vision API
      for (const msg of messages) {
        if (msg.image) {
          // Validate image URL format (must be data URL or http URL)
          if (!msg.image.startsWith('data:') && !msg.image.startsWith('http')) {
            return res.status(400).json({ 
              message: "Invalid image format in conversation. Image must be a data URL or HTTP URL." 
            });
          }
          
          // Validate image type (only PNG, JPEG, and JPG allowed)
          const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
          const isDataUrl = msg.image.startsWith('data:');
          if (isDataUrl) {
            const mimeType = msg.image.split(';')[0].split(':')[1];
            if (!allowedTypes.includes(mimeType)) {
              return res.status(400).json({
                message: "Only PNG, JPEG, and JPG image files are allowed in chat"
              });
            }
          }
          
          // For messages with images, we need to use the special format for multi-modal content
          formattedVisionMessages.push({
            role: msg.role as "user" | "assistant" | "system",
            content: [
              { type: "text", text: msg.content || "What can you tell me about this image?" },
              { type: "image_url", image_url: { url: msg.image } },
            ],
          });
        } else {
          // For text-only messages
          formattedVisionMessages.push({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content || "",
          });
        }
      }

      // Call TogetherAI Vision model with rotating API keys
      const togetherClient = getTogetherClient();
      const visionResponse = await togetherClient.chat.completions.create({
        model: "meta-llama/Llama-Vision-Free",
        // Type assertion needed due to complex structure
        messages: formattedVisionMessages as any,
        max_tokens: 4000, // Maximum safe token limit for vision model
        temperature: 0.7,
      });

      // Return the response
      const messageContent =
        visionResponse.choices &&
        visionResponse.choices.length > 0 &&
        visionResponse.choices[0].message
          ? visionResponse.choices[0].message.content
          : "Sorry, I couldn't analyze the conversation with images.";

      return res.json({
        message: messageContent,
        id: visionResponse.id,
      });
    } else {
      // For regular text-only conversations, use the standard model
      // Format messages for the API (strip out any image properties)
      const formattedTextMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((msg: any) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content || "", // Ensure content is never null or undefined
        })),
      ];

      // Call TogetherAI API (text model) with rotating API keys
      const togetherClient = getTogetherClient();
      const response = await togetherClient.chat.completions.create({
        messages: formattedTextMessages as any,
        model: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
        temperature: 0.7,
        max_tokens: 4000, // Increased token limit for text model
      });

      // Return the response
      const messageContent =
        response.choices &&
        response.choices.length > 0 &&
        response.choices[0].message
          ? response.choices[0].message.content
          : "Sorry, I couldn't generate a response.";

      return res.json({
        message: messageContent,
        id: response.id,
      });
    }
  } catch (error) {
    console.error("AI Chat Error:", error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Analyze an image using TogetherAI's vision model
 */
export async function analyzeImage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Make sure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { prompt, image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "No image provided" });
    }

    // System prompt for image analysis
    const systemPrompt = `You are an AI-powered educational assistant analyzing an image for students. 
    Describe the image in detail relevant to educational contexts. 
    Focus on explaining concepts, identifying educational content, and providing relevant insights.
    Be thorough, clear, and educational in your response.`;

    try {
      // Validate image URL format (must be data URL or http URL)
      if (!image.startsWith('data:') && !image.startsWith('http')) {
        return res.status(400).json({ 
          message: "Invalid image format. Image must be a data URL or HTTP URL." 
        });
      }
      
      // Validate image type (only PNG, JPEG, and JPG allowed)
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
      const isDataUrl = image.startsWith('data:');
      if (isDataUrl) {
        const mimeType = image.split(';')[0].split(':')[1];
        if (!allowedTypes.includes(mimeType)) {
          return res.status(400).json({
            message: "Only PNG, JPEG, and JPG image files are allowed"
          });
        }
      }
      
      // Call TogetherAI Vision model (Llama-Vision-Free) with rotating API keys
      const togetherClient = getTogetherClient();
      
      // Properly formatted content for vision model - with correct type annotations
      const userContent: { type: string; text?: string; image_url?: { url: string } }[] = [
        {
          type: "text",
          text: prompt || "What can you tell me about this image?",
        },
        { 
          type: "image_url", 
          image_url: { url: image } 
        },
      ];
      
      const response = await togetherClient.chat.completions.create({
        model: "meta-llama/Llama-Vision-Free",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: userContent as any, // Type assertion needed due to complex structure
          },
        ] as any, // Type assertion needed for TogetherAI API compatibility
        max_tokens: 4000, // Increased token limit for better analysis
        temperature: 0.7,
      });

      // Get the response text
      const messageContent =
        response.choices &&
        response.choices.length > 0 &&
        response.choices[0].message
          ? response.choices[0].message.content
          : "Sorry, I couldn't analyze the image properly.";

      // Return the analysis
      res.json({
        message: messageContent,
        id: response.id,
      });
    } catch (error) {
      console.error("Image Analysis Error:", error);
      return res.status(500).json({
        message: "Failed to analyze the image",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    console.error("Image Analysis Error:", error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Handle image upload
 */
export const handleImageUpload = upload.single("image");

/**
 * Process uploaded image and store it
 */
export async function uploadImage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Return the uploaded file information
    res.status(200).json({
      imageUrl: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
    });
  } catch (error) {
    console.error("Image Upload Error:", error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Generate an image using TogetherAI's image generation model
 */
export async function generateImage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Make sure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { prompt, width = 1024, height = 768, steps = 4 } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    try {
      // Get Together client with next API key in rotation
      const together = getTogetherClient();

      // Generate image using FLUX.1-schnell-Free model
      const response = await together.images.create({
        model: "black-forest-labs/FLUX.1-schnell-Free",
        prompt,
        width: parseInt(width) || 1024,
        height: parseInt(height) || 768,
        steps: parseInt(steps) || 4,
        n: 1,
      });

      // Extract the image data
      if (response.data && response.data.length > 0) {
        // Type assertion needed for Together AI API compatibility
        const imageData = (response.data[0] as any).b64_json || (response.data[0] as any).url || "";
        
        // Return success with the image data
        return res.json({
          success: true,
          imageData,
          mimeType: "image/jpeg"
        });
      } else {
        return res.status(500).json({
          message: "Failed to generate image",
          error: "No image data returned from API"
        });
      }
    } catch (error) {
      console.error("Image Generation Error:", error);
      return res.status(500).json({
        message: "Failed to generate image",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    console.error("Image Generation Error:", error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Log an AI chat interaction to the activity logs
 */
export async function logAIChat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Make sure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const { courseId } = req.body;

    // Create activity log entry
    const activityLogData = {
      userId,
      activityType: "ai_chat",
      resourceId: courseId || 0,
      resourceType: courseId ? "course" : "general",
      tenantId: req.user.tenantId,
    };

    const log = await storage.createActivityLog(activityLogData);

    res.status(201).json(log);
  } catch (error) {
    console.error("AI Chat Log Error:", error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
}
