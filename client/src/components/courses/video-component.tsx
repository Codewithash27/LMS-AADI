import { useState, useEffect } from "react";
import { ExternalLink, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VideoComponentProps {
  videoUrl: string;
}

export default function VideoComponent({ videoUrl }: VideoComponentProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [videoType, setVideoType] = useState<'youtube' | 'twitter' | 'vimeo' | 'other' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract YouTube video ID
    const parseYouTubeUrl = (url: string): string | null => {
      // Handle different YouTube URL formats
      const regexPatterns = [
        /(?:youtube\.com\/watch\?v=|youtu.be\/|youtube.com\/embed\/)([^&?/]+)/i,
        /youtube.com\/shorts\/([^&?/]+)/i
      ];
      
      for (const pattern of regexPatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      return null;
    };
    
    // Extract Vimeo video ID
    const parseVimeoUrl = (url: string): string | null => {
      const regex = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)(?:[/?].*)?/i;
      const match = url.match(regex);
      return match && match[1] ? match[1] : null;
    };
    
    // Check for social media platforms
    const detectPlatform = (url: string) => {
      if (/youtube\.com|youtu\.be/i.test(url)) {
        return 'youtube';
      } else if (/vimeo\.com/i.test(url)) {
        return 'vimeo';
      } else if (/twitter\.com|x\.com/i.test(url)) {
        return 'twitter';
      }
      return 'other';
    };
    
    try {
      // Check what type of video URL we have
      const platform = detectPlatform(videoUrl);
      setVideoType(platform);
      
      // Process based on platform
      switch (platform) {
        case 'youtube':
          const youtubeId = parseYouTubeUrl(videoUrl);
          if (youtubeId) {
            setEmbedUrl(`https://www.youtube.com/embed/${youtubeId}`);
          } else {
            setError("Invalid YouTube URL");
          }
          break;
          
        case 'vimeo':
          const vimeoId = parseVimeoUrl(videoUrl);
          if (vimeoId) {
            setEmbedUrl(`https://player.vimeo.com/video/${vimeoId}`);
          } else {
            setError("Invalid Vimeo URL");
          }
          break;
          
        case 'twitter':
          // Just display link for Twitter
          break;
          
        default:
          // For other URLs, just keep the original URL
          break;
      }
    } catch (err) {
      setError("Error processing video URL");
      console.error("Video component error:", err);
    }
  }, [videoUrl]);

  if (error) {
    return (
      <div className="my-4">
        <Card className="overflow-hidden border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <p className="text-sm text-orange-700 mb-2">
                {error}
              </p>
              <a 
                href={videoUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View original link <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (videoType === 'twitter') {
    return (
      <div className="my-4">
        <Card className="overflow-hidden relative">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="h-5 w-5 bg-sky-500 rounded-full flex items-center justify-center mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14">
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                  </svg>
                </div>
                <span className="font-medium">Twitter Post</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                This content is hosted on Twitter. View the original post for the full experience.
              </p>
              <a 
                href={videoUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Button variant="outline" size="sm" className="w-full justify-center">
                  View on Twitter <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className="my-4">
        <Card className="overflow-hidden relative">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <Play className="h-5 w-5 text-gray-500 mr-2" /> 
                <span className="font-medium">Video Content</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                This content is linked from an external source.
              </p>
              <a 
                href={videoUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Button variant="outline" size="sm" className="w-full justify-center">
                  Open video link <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="my-4">
      <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden shadow-lg">
        <iframe
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-lg border-0"
          style={{ 
            aspectRatio: "16/9",
            minHeight: "315px" 
          }}
          title="Video content"
        />
      </div>
    </div>
  );
}