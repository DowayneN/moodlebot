
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FileUpload from '@/components/FileUpload';
import ChatInterface from '@/components/ChatInterface';
import Logo from '@/components/Logo';
import { useChat } from '@/hooks/useChat';
import { summarizeData } from '@/utils/fileProcessing';
import { AlertCircle, Info, Trash2, Settings, FileText, Database, Key } from 'lucide-react';

const Index = () => {
  const { 
    messages, 
    loading, 
    knowledgeBase, 
    apiKey,
    sendMessage, 
    updateKnowledgeBase, 
    updateApiKey,
    clearChat 
  } = useChat();
  
  const [tempApiKey, setTempApiKey] = useState('');

  const handleTextFileProcessed = (content: string) => {
    updateKnowledgeBase({ textContent: content });
  };

  const handleCSVFileProcessed = (data: any[]) => {
    updateKnowledgeBase({ csvData: data });
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempApiKey.trim()) {
      updateApiKey(tempApiKey);
      setTempApiKey('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-gray-100">
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Logo size="md" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-moodle-black">MoodleBot</h1>
              <p className="text-sm text-gray-500">AI-powered educational assistant</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="text-sm"
              onClick={clearChat}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Tabs defaultValue="files" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files" className="flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Data Files
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="files" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Base</CardTitle>
                  <CardDescription>
                    Upload your text and CSV files to create a knowledge base for MoodleBot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <FileUpload 
                    fileType="txt" 
                    onFileProcessed={handleTextFileProcessed}
                    title="Text Data"
                    description="Upload preprocessed .txt data for the chatbot"
                  />
                  
                  <FileUpload 
                    fileType="csv" 
                    onFileProcessed={handleCSVFileProcessed}
                    title="CSV Metadata"
                    description="Upload .csv file with additional metadata"
                  />

                  {knowledgeBase.isLoaded && (
                    <Alert className="mt-6 animate-fade-in">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Knowledge Base Loaded</AlertTitle>
                      <AlertDescription className="text-xs text-muted-foreground whitespace-pre-line">
                        {summarizeData(knowledgeBase.textContent, knowledgeBase.csvData)}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>
                    Configure your OpenAI API key for MoodleBot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleApiKeySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        OpenAI API Key
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          type="password"
                          placeholder={apiKey ? "••••••••••••••••••••••" : "Enter your API key"}
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="submit" disabled={!tempApiKey.trim()}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </form>

                  {!apiKey && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>API Key Required</AlertTitle>
                      <AlertDescription>
                        Please set your OpenAI API key to use the chatbot.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Info className="h-4 w-4 mr-2" />
                      Note for Demo
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This is a demo application. In a real implementation, you would need to provide 
                      a valid OpenAI API key. For demonstration purposes, the chatbot will provide 
                      simulated responses without calling the actual API.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-2 flex flex-col">
          <Card className="flex flex-col flex-1 overflow-hidden">
            <CardHeader className="border-b bg-moodle-gray/30 py-3">
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                MoodleBot Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex overflow-hidden">
              <ChatInterface 
                messages={messages}
                loading={loading}
                onSendMessage={sendMessage}
                isKnowledgeBaseLoaded={knowledgeBase.isLoaded && !!apiKey}
              />
            </CardContent>
          </Card>
        </div>
      </main>
      
      <footer className="bg-white border-t py-4 px-6 text-center text-sm text-gray-500">
        <p>MoodleBot - AI-powered educational assistant</p>
      </footer>
    </div>
  );
};

export default Index;
