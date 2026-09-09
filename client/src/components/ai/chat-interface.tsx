import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, Send, Bot, User, Brain, ArrowDown, ArrowDownCircle, 
  Image as ImageIcon, X, Eraser, RefreshCw, Copy, PencilRuler,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github-dark.css";
import { ImageUpload } from "./image-upload";

// Component to toggle showing AI thinking process
interface ThinkingToggleProps {
  content: string;
}

function ThinkingToggle({ content }: ThinkingToggleProps) {
  const [showThinking, setShowThinking] = useState(false);
  
  // Extract the thinking content from between <think> tags
  const extractThinking = () => {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    return thinkMatch ? thinkMatch[1].trim() : "";
  };
  
  const thinkingContent = extractThinking();
  
  if (!thinkingContent) return null;
  
  return (
    <div className="mt-3">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setShowThinking(!showThinking)}
        className="flex items-center gap-1 text-xs"
      >
        <Brain size={14} />
        {showThinking ? "Hide Thinking" : "See Thinking"}
      </Button>
      
      {showThinking && (
        <div className="mt-2 p-3 border border-dashed border-gray-300 rounded-md bg-gray-50 dark:bg-gray-900 italic text-sm text-muted-foreground prose dark:prose-invert max-w-none prose-sm">
          <ReactMarkdown rehypePlugins={[rehypeHighlight, rehypeRaw]}>
            {thinkingContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// Define message structure
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  image?: string; // Optional image URL or base64 data
}

// Function to handle copying a message to clipboard
function handleCopyToClipboard(message: Message, toast: any) {
  // Clean up the content by removing thinking tags if present
  const cleanContent = message.content.includes('<think>') 
    ? message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    : message.content;
  
  // Use the Clipboard API to copy text
  navigator.clipboard.writeText(cleanContent)
    .then(() => {
      // Show success toast
      toast({
        title: "Copied to clipboard",
        description: "Response has been copied to your clipboard.",
        variant: "default"
      });
    })
    .catch(err => {
      // Show error toast if clipboard operations fail
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive"
      });
      console.error('Failed to copy text: ', err);
    });
}

// Define course structure
interface Course {
  id: number;
  title: string;
  description?: string;
}

export function AIChatInterface() {
  const [inputValue, setInputValue] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("0");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageMode, setIsImageMode] = useState(false);
  const [isImageGenMode, setIsImageGenMode] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI learning assistant. How can I help you with your courses today?",
      timestamp: new Date()
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });
  
  interface ChatResponse {
    message: string;
    id: string;
  }
  
  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (messageData: { messages: (Omit<Message, "timestamp"> & { image?: string })[], courseContext?: { id: number, title: string, description?: string } }) => {
      const response = await apiRequest("POST", "/api/ai/chat", messageData);
      return response.json() as Promise<ChatResponse>;
    },
    onSuccess: (response) => {
      const aiMessage: Message = {
        role: "assistant",
        content: response.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Log the AI chat interaction
      if (selectedCourseId && selectedCourseId !== "0") {
        logChatMutation.mutate({ courseId: parseInt(selectedCourseId) });
      } else {
        logChatMutation.mutate({ });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get a response from the AI assistant. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Log chat activity mutation
  const logChatMutation = useMutation({
    mutationFn: async (data: { courseId?: number }) => {
      return apiRequest("POST", "/api/ai/log", data);
    }
  });
  
  // Scroll to bottom of chat when messages update or when the chat mutation is complete
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setShowScrollButton(false); // Hide scroll button when automatically scrolling to bottom
  }, [messages, chatMutation.isSuccess]);
  
  // Add scroll event listener to show/hide the scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Show button if user has scrolled up (more than 100px from bottom)
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollButton(isScrolledUp);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Function to scroll to the bottom when the button is clicked
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setShowScrollButton(false);
    }
  };
  
  // Function to clear chat history
  const handleClearChat = () => {
    // Keep only the initial welcome message
    setMessages([{
      role: "assistant",
      content: "Hello! I'm your AI learning assistant. How can I help you with your courses today?",
      timestamp: new Date()
    }]);
    // Reset other states
    setInputValue("");
    handleImageRemove();
    
    // Show confirmation toast
    toast({
      title: "Chat cleared",
      description: "Your conversation history has been cleared.",
      variant: "default"
    });
  };
  
  // Handle image upload
  const handleImageUpload = (file: File) => {
    if (file) {
      setSelectedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setIsImageMode(true);
    }
  };

  // Handle image removal
  const handleImageRemove = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    setIsImageMode(false);
  };
  
  // Handle image generation
  const handleGenerateImage = () => {
    if (!inputValue.trim() || generateImageMutation.isPending) return;
    
    setIsGeneratingImage(true);
    generateImageMutation.mutate(inputValue);
    // Clear input after submitting
    setInputValue("");
  };
  
  // Toggle image generation mode
  const toggleImageGenMode = () => {
    if (isImageGenMode) {
      setIsImageGenMode(false);
    } else {
      setIsImageGenMode(true);
      setIsImageMode(false);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
      setSelectedImage(null);
    }
  };

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/ai/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      return response.json() as Promise<{ imageUrl: string }>;
    },
    onSuccess: (data) => {
      return data.imageUrl;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload the image. Please try again.",
        variant: "destructive"
      });
      handleImageRemove();
    }
  });
  
  // Image generation mutation
  const generateImageMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/ai/generate-image", { prompt });
      if (!response.ok) {
        throw new Error('Failed to generate image');
      }
      return response.json() as Promise<{ success: boolean, imageData: string, mimeType: string }>;
    },
    onSuccess: (data) => {
      if (data.success && data.imageData) {
        // Check if imageData is a URL or base64 data
        const imageSource = data.imageData.startsWith('http') 
          ? data.imageData // Use URL directly
          : `data:${data.mimeType || 'image/jpeg'};base64,${data.imageData}`; // Create base64 URL
        
        // Add the user prompt message (already added when clicking generate)
        const lastMessage = messages[messages.length - 1];
        const promptText = lastMessage && lastMessage.role === "user" 
          ? lastMessage.content 
          : "Generate an image";
        
        // Add the AI response with the generated image
        const aiMessage: Message = {
          role: "assistant",
          content: `Image generated based on your prompt: "${promptText}"`,
          timestamp: new Date(),
          image: imageSource
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Reset image generation state
        setIsImageGenMode(false);
        
        // Log AI interaction
        if (selectedCourseId && selectedCourseId !== "0") {
          logChatMutation.mutate({ courseId: parseInt(selectedCourseId) });
        } else {
          logChatMutation.mutate({});
        }
      }
      setIsGeneratingImage(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate the image. Please try again.",
        variant: "destructive"
      });
      console.error("Image generation error:", error);
      setIsGeneratingImage(false);
    }
  });

  // Handle sending a message with or without image
  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || chatMutation.isPending) return;
    
    let finalUserContent = inputValue;
    let tempImageFile = null;
    
    // Store the current image for processing but immediately clear the UI
    if (selectedImage) {
      tempImageFile = selectedImage;
      // Clear the image input immediately after clicking send
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
      setSelectedImage(null);
      setIsImageMode(false);
    }
    
    // Create the user message
    const userMessage: Message = {
      role: "user",
      content: finalUserContent,
      timestamp: new Date()
    };
    
    // Add to messages
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input immediately
    setInputValue("");
    
    // Get course context if selected
    let courseContext;
    if (selectedCourseId && selectedCourseId !== "0") {
      const selectedCourse = courses.find(c => c.id === parseInt(selectedCourseId));
      if (selectedCourse) {
        courseContext = {
          id: selectedCourse.id,
          title: selectedCourse.title,
          description: selectedCourse.description
        };
      }
    }

    // If there's an image, handle it first
    if (tempImageFile) {
      setIsUploadingImage(true);
      try {
        // Convert image to base64 for sending and displaying
        const imageBase64 = await convertFileToBase64(tempImageFile);
        
        // Update the user message with the image
        const updatedUserMessage: Message = {
          ...userMessage,
          image: imageBase64,
        };
        
        // Update the message in the messages array
        setMessages(prev => prev.map((msg, idx) => 
          idx === prev.length - 1 ? updatedUserMessage : msg
        ));
        
        const response = await fetch('/api/ai/image-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: finalUserContent || "What can you tell me about this image?",
            image: imageBase64
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to analyze image');
        }

        const data = await response.json();
        
        const aiMessage: Message = {
          role: "assistant",
          content: data.message,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Log activity
        if (selectedCourseId && selectedCourseId !== "0") {
          logChatMutation.mutate({ courseId: parseInt(selectedCourseId) });
        } else {
          logChatMutation.mutate({});
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to analyze the image. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsUploadingImage(false);
      }
    } else {
      // Regular text message - send to API with full context including images
      const formattedMessages = messages
        .concat(userMessage)
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(({ role, content, image }) => ({ 
          role, 
          content,
          // Only include image if it exists
          ...(image && { image })
        }));
        
      chatMutation.mutate({ 
        messages: formattedMessages, 
        courseContext 
      });
    }
  };

  // Helper function to convert File to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // Typing indicator component with Gemini-style paragraph skeleton loaders
  const TypingIndicator = () => (
    <div className="flex justify-start">
      <div className="max-w-[90%] w-full md:w-3/4 rounded-lg px-4 py-3 bg-secondary text-secondary-foreground">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} />
          <span className="text-xs">
            AI Assistant • Thinking
          </span>
        </div>
        <div className="space-y-2">
          {/* First paragraph - longer */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-secondary-foreground/20 rounded-full w-full animate-pulse"></div>
            <div className="h-3 bg-secondary-foreground/20 rounded-full w-[90%] animate-pulse" style={{ animationDelay: "100ms" }}></div>
            <div className="h-3 bg-secondary-foreground/20 rounded-full w-[95%] animate-pulse" style={{ animationDelay: "200ms" }}></div>
          </div>
          
          {/* Second paragraph - medium */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-secondary-foreground/20 rounded-full w-[85%] animate-pulse" style={{ animationDelay: "300ms" }}></div>
            <div className="h-3 bg-secondary-foreground/20 rounded-full w-[75%] animate-pulse" style={{ animationDelay: "400ms" }}></div>
          </div>
          
          {/* Third paragraph - shorter */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-secondary-foreground/20 rounded-full w-[60%] animate-pulse" style={{ animationDelay: "500ms" }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full relative">
      <div className="bg-card rounded-t-lg shadow-sm mb-0">
        <div className="p-4 pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-primary" />
              <h3 className="text-lg font-semibold">AI Learning Assistant</h3>
              
              {/* Clear chat button */}
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 text-muted-foreground hover:text-foreground"
                onClick={handleClearChat}
                title="Clear conversation"
                disabled={messages.length <= 1 || chatMutation.isPending || isUploadingImage}
              >
                <Eraser className="h-4 w-4 mr-1" />
                <span className="text-xs">Clear</span>
              </Button>
            </div>
            <div className="w-full md:w-auto">
              <Select 
                value={selectedCourseId || ""} 
                onValueChange={setSelectedCourseId}
              >
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder="Select a course context (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">General Learning</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecting a course helps the AI provide more relevant answers
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages area with padding at the bottom to prevent content from being hidden behind the fixed input bar */}
      <div ref={messagesContainerRef} className="flex-grow overflow-y-auto space-y-4 p-4 pb-[90px] relative">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-4 py-2 ${
                message.role === "assistant" 
                  ? "bg-secondary text-secondary-foreground" 
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {message.role === "assistant" ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Bot size={16} />
                      <span className="text-xs">
                        AI Assistant • {" "}
                        {new Date(message.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Copy to clipboard button for AI messages */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyToClipboard(message, toast);
                      }}
                      title="Copy response to clipboard"
                    >
                      <Copy size={14} />
                      <span className="sr-only">Copy to clipboard</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    <span className="text-xs">
                      You • {new Date(message.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
              <div className="prose dark:prose-invert max-w-none">
                {/* Display image if available (for user messages) */}
                {message.image && (
                  <div className="mb-3">
                    <img 
                      src={message.image} 
                      alt="Uploaded" 
                      className="max-h-60 rounded-md border border-muted"
                    />
                  </div>
                )}
                
                {/* Display text content */}
                {message.content.includes('<think>') ? (
                  <>
                    <ReactMarkdown 
                      rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      components={{
                        code: ({node, inline, className, children, ...props}: any) => {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="relative mt-2 mb-3 rounded-md overflow-hidden">
                              <div className="bg-zinc-800 px-4 py-1 text-xs text-zinc-300 flex justify-between items-center">
                                <span>{match[1]}</span>
                                <button 
                                  className="hover:text-white" 
                                  onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                                >
                                  Copy
                                </button>
                              </div>
                              <pre className="p-4 overflow-x-auto bg-zinc-900 text-zinc-100 text-sm rounded-b-md m-0">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            </div>
                          ) : (
                            <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()}
                    </ReactMarkdown>
                    <ThinkingToggle content={message.content} />
                  </>
                ) : (
                  <ReactMarkdown 
                    rehypePlugins={[rehypeHighlight, rehypeRaw]}
                    components={{
                      code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div className="relative mt-2 mb-3 rounded-md overflow-hidden">
                            <div className="bg-zinc-800 px-4 py-1 text-xs text-zinc-300 flex justify-between items-center">
                              <span>{match[1]}</span>
                              <button 
                                className="hover:text-white" 
                                onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                              >
                                Copy
                              </button>
                            </div>
                            <pre className="p-4 overflow-x-auto bg-zinc-900 text-zinc-100 text-sm rounded-b-md m-0">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        ) : (
                          <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-sm" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Show typing indicator when waiting for AI response or generating an image */}
        {(chatMutation.isPending || isUploadingImage || isGeneratingImage) && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
        
        {/* Back to bottom button */}
        {showScrollButton && (
          <div className="absolute bottom-[100px] right-4 z-10">
            <Button 
              size="sm" 
              variant="secondary" 
              className="rounded-full p-2 shadow-md"
              onClick={scrollToBottom}
            >
              <ArrowDownCircle className="h-5 w-5" />
              <span className="sr-only">Back to bottom</span>
            </Button>
          </div>
        )}
      </div>
      
      {/* Fixed input bar at the bottom - Teams-style */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-5 bg-background border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)] z-10 md:left-[240px] lg:left-[280px]">
        {/* Image upload area - shown when in image mode */}
        {isImageMode && (
          <div className="mb-3">
            <ImageUpload 
              onImageUpload={handleImageUpload} 
              onImageRemove={handleImageRemove}
              imagePreview={imagePreview}
              isUploading={isUploadingImage || chatMutation.isPending}
            />
          </div>
        )}
        
        {/* Image generation mode indicator - shown when in image generation mode */}
        {isImageGenMode && (
          <div className="mb-2">
            <div className="flex items-center gap-2 py-1 px-2 bg-muted rounded-md inline-block">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs text-muted-foreground">
                Image Generation Mode: Type your prompt and press Enter or click Send
              </span>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2 w-full">
          {/* Image upload button */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => !isImageMode ? setIsImageMode(true) : handleImageRemove()}
            disabled={chatMutation.isPending || isUploadingImage || isImageGenMode || generateImageMutation.isPending}
            title={isImageMode ? "Cancel image upload" : "Upload an image"}
          >
            {isImageMode ? (
              <X className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="sr-only">
              {isImageMode ? "Cancel image upload" : "Upload an image"}
            </span>
          </Button>
          
          {/* Image generation button */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={toggleImageGenMode}
            disabled={chatMutation.isPending || isUploadingImage || isImageMode || generateImageMutation.isPending}
            title={isImageGenMode ? "Cancel image generation" : "Generate an image"}
          >
            {isImageGenMode ? (
              <X className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="sr-only">
              {isImageGenMode ? "Cancel image generation" : "Generate an image"}
            </span>
          </Button>
          
          <div className="flex-1 min-w-0"> {/* min-width: 0 prevents flex item from overflowing */}
            <Input
              placeholder={
                isImageMode 
                  ? "Ask about this image..." 
                  : isImageGenMode 
                    ? "Describe the image you want to generate..." 
                    : "Ask a question..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={chatMutation.isPending || isUploadingImage}
              className="w-full border-primary/20 focus-visible:ring-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (isImageGenMode) {
                    handleGenerateImage();
                  } else {
                    handleSendMessage();
                  }
                }
              }}
            />
          </div>
          
          <Button 
            onClick={isImageGenMode ? handleGenerateImage : handleSendMessage} 
            disabled={(chatMutation.isPending || isUploadingImage || generateImageMutation.isPending || (!inputValue.trim() && !selectedImage))}
            className="flex-shrink-0"
          >
            {(chatMutation.isPending || isUploadingImage || generateImageMutation.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isImageGenMode ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}