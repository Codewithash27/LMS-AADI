import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Header from "@/components/layout/header";
import { AIChatInterface } from "@/components/ai/chat-interface";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Bot, BookOpen, GraduationCap, HelpCircle } from "lucide-react";

export default function StudentAIAssistant() {
  const [activeTab, setActiveTab] = useState("chat");
  
  return (
    <DashboardLayout>
      <Header 
        title="AI Learning Assistant"
      />

      <div className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <Bot size={16} />
                Chat
              </TabsTrigger>
              <TabsTrigger value="tips" className="flex items-center gap-2">
                <HelpCircle size={16} />
                How To Use
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="relative flex-1 h-[calc(100vh-200px)] mt-6">
            <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto w-full h-full">
              <AIChatInterface />
            </div>
          </TabsContent>
          
          <TabsContent value="tips" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-accent-brand">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    Study Assistance
                  </CardTitle>
                  <CardDescription>
                    How the AI can help with your studies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Concept Explanations</h3>
                    <p className="text-sm text-muted-foreground">
                      Ask the AI to explain complex concepts from your courses in simpler terms.
                      Try: "Can you explain object-oriented programming principles?"
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Study Summaries</h3>
                    <p className="text-sm text-muted-foreground">
                      Request summaries of topics to help with revision.
                      Try: "Summarize the key points about database normalization."
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Practice Problems</h3>
                    <p className="text-sm text-muted-foreground">
                      Ask for practice questions on specific topics.
                      Try: "Give me some practice problems about JavaScript closures."
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="backdrop-blur-sm bg-white/70 border border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-accent-brand">
                      <GraduationCap className="h-4 w-4 text-white" />
                    </div>
                    Tips for Better Results
                  </CardTitle>
                  <CardDescription>
                    How to get the most out of the AI assistant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Be Specific</h3>
                    <p className="text-sm text-muted-foreground">
                      The more specific your question, the better the answer.
                      Instead of "Tell me about databases," try "Explain the differences between SQL and NoSQL databases."
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Select a Course</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a course from the dropdown to help the AI provide more relevant answers to your specific curriculum.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Follow-up Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      Don't hesitate to ask follow-up questions if you need more details or clarification on a topic.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}