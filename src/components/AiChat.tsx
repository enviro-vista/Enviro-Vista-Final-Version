import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Send, Loader2, MessageSquare, Settings2, Trash2 } from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { useSensorReadings } from '@/hooks/useSensorReadings';
import { 
  useChatHistory, 
  useAddChatMessage, 
  useChatPreferences, 
  useUpdateChatPreferences,
  useUpdateLastSuggestionTime,
  useClearChatHistory,
  type ChatMessage 
} from '@/hooks/useChatHistory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AiChatProps {
  className?: string;
  compact?: boolean;
}

export default function AiChat({ className, compact = false }: AiChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Hooks for data management
  const { data: devices = [] } = useDevices();
  const { data: sensorData = [] } = useSensorReadings('all');
  const { data: chatHistory = [], isLoading: loadingHistory } = useChatHistory();
  const { data: preferences } = useChatPreferences();
  const addMessageMutation = useAddChatMessage();
  const updatePreferencesMutation = useUpdateChatPreferences();
  const updateLastSuggestionMutation = useUpdateLastSuggestionTime();
  const clearHistoryMutation = useClearChatHistory();
  const { toast } = useToast();

  // Local state derived from preferences
  const autoSuggestionsEnabled = preferences?.auto_suggestions_enabled ?? true;
  const lastSuggestionTime = preferences?.last_auto_suggestion ? new Date(preferences.last_auto_suggestion) : null;
  const suggestionInterval = preferences?.suggestion_interval_hours ?? 4;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Initialize with welcome message if no history exists
  useEffect(() => {
    if (!loadingHistory && chatHistory.length === 0) {
      addMessageMutation.mutate({
        role: 'assistant',
        content: "👋 Hi! I'm your agricultural AI assistant. I can analyze your sensor data and provide recommendations for optimal growing conditions. You can ask me questions anytime, or I'll automatically provide insights every 4 hours based on your sensor readings.",
        context: 'auto_suggestion',
      });
    }
  }, [loadingHistory, chatHistory.length]);

  // Auto suggestion system
  useEffect(() => {
    if (!autoSuggestionsEnabled) return;

    const checkForAutoSuggestion = () => {
      const now = new Date();
      
      // Check if it's been the required interval since last suggestion
      if (!lastSuggestionTime || (now.getTime() - lastSuggestionTime.getTime()) >= suggestionInterval * 60 * 60 * 1000) {
        if (devices.length > 0 && sensorData.length > 0) {
          generateAutoSuggestion();
        }
      }
    };

    // Check immediately and then every hour
    checkForAutoSuggestion();
    const interval = setInterval(checkForAutoSuggestion, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoSuggestionsEnabled, lastSuggestionTime, suggestionInterval, devices, sensorData]);

  const aggregateSensorData = () => {
    if (!sensorData.length) return null;

    // Get latest readings from each device
    const deviceReadings = devices.map(device => {
      const readings = sensorData.filter(reading => reading.device_id === device.device_id);
      const latestReading = readings[readings.length - 1];
      
      return {
        deviceName: device.name,
        deviceType: device.device_type as 'AIR' | 'SOIL',
        cropType: (device as any).crop_type || null,
        reading: latestReading,
      };
    }).filter(d => d.reading);

    // Calculate averages and ranges
    const stats = {
      temperature: {
        avg: deviceReadings.reduce((sum, d) => sum + (d.reading?.temperature || 0), 0) / deviceReadings.length,
        min: Math.min(...deviceReadings.map(d => d.reading?.temperature || 0)),
        max: Math.max(...deviceReadings.map(d => d.reading?.temperature || 0)),
      },
      humidity: {
        avg: deviceReadings.reduce((sum, d) => sum + (d.reading?.humidity || 0), 0) / deviceReadings.length,
        min: Math.min(...deviceReadings.map(d => d.reading?.humidity || 0)),
        max: Math.max(...deviceReadings.map(d => d.reading?.humidity || 0)),
      },
      pressure: {
        avg: deviceReadings.reduce((sum, d) => sum + (d.reading?.pressure || 0), 0) / deviceReadings.length,
        min: Math.min(...deviceReadings.map(d => d.reading?.pressure || 0)),
        max: Math.max(...deviceReadings.map(d => d.reading?.pressure || 0)),
      },
      dewPoint: {
        avg: deviceReadings.reduce((sum, d) => sum + (d.reading?.dew_point || 0), 0) / deviceReadings.length,
        min: Math.min(...deviceReadings.map(d => d.reading?.dew_point || 0)),
        max: Math.max(...deviceReadings.map(d => d.reading?.dew_point || 0)),
      },
    };

    return {
      timestamp: new Date().toISOString(),
      deviceCount: deviceReadings.length,
      onlineDevices: deviceReadings.length,
      devices: deviceReadings,
      statistics: stats,
      cropTypes: [...new Set(deviceReadings.map(d => d.cropType).filter(Boolean))],
    };
  };

  const generateAutoSuggestion = async () => {
    if (isLoading) return;

    const aggregatedData = aggregateSensorData();
    if (!aggregatedData) return;

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-suggestions', {
        body: {
          sensorData: aggregatedData,
          context: 'auto_suggestion',
          prompt: `Analyze the current sensor data and provide actionable recommendations for optimal plant growth. Focus on:
1. Current environmental conditions assessment
2. Immediate actions needed (if any)
3. Preventive measures for next ${suggestionInterval} hours
4. Optimization suggestions specific to the crop types: ${aggregatedData.cropTypes.join(', ') || 'general'}`,
        },
      });

      if (error) throw error;

      // Save to database
      await addMessageMutation.mutateAsync({
        role: 'assistant',
        content: data.suggestion,
        sensor_data: aggregatedData,
        context: 'auto_suggestion',
        tokens_used: data.tokensUsed,
      });

      // Update last suggestion time
      await updateLastSuggestionMutation.mutateAsync();
      
      // Show notification for auto-suggestions
      toast({
        title: "🤖 New AI Insights Available",
        description: "Check the chat for latest recommendations based on your sensor data.",
      });
    } catch (error) {
      console.error('Error generating auto suggestion:', error);
      toast({
        title: "AI Suggestion Failed",
        description: "Unable to generate automatic suggestions. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Save user message first
      await addMessageMutation.mutateAsync({
        role: 'user',
        content: userInput,
        context: 'user_question',
      });

      const aggregatedData = aggregateSensorData();
      
      const { data, error } = await supabase.functions.invoke('ai-suggestions', {
        body: {
          sensorData: aggregatedData,
          context: 'user_question',
          prompt: userInput,
          chatHistory: chatHistory.slice(-10), // Send last 10 messages for context
        },
      });

      if (error) throw error;

      // Save assistant response
      await addMessageMutation.mutateAsync({
        role: 'assistant',
        content: data.suggestion,
        sensor_data: aggregatedData,
        context: 'user_question',
        tokens_used: data.tokensUsed,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Save error message
      await addMessageMutation.mutateAsync({
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        context: 'user_question',
      });
      
      toast({
        title: "Message Failed",
        description: "Unable to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleQuickInsight = () => {
    setInput('What should I focus on right now?');
    sendMessage();
  };

  const toggleAutoSuggestions = () => {
    updatePreferencesMutation.mutate({
      auto_suggestions_enabled: !autoSuggestionsEnabled,
    });
  };

  const clearHistory = () => {
    clearHistoryMutation.mutate();
    toast({
      title: "Chat Cleared",
      description: "Your chat history has been cleared.",
    });
  };

  if (compact) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Assistant
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {autoSuggestionsEnabled ? 'Auto' : 'Manual'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {lastSuggestionTime ? (
              `Last suggestion: ${formatTime(lastSuggestionTime.toISOString())}`
            ) : (
              'Monitoring your sensors...'
            )}
          </div>
          <Button 
            onClick={handleQuickInsight}
            disabled={isLoading || loadingHistory}
            className="w-full"
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            Get Current Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agricultural Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={autoSuggestionsEnabled ? "default" : "secondary"}>
              {autoSuggestionsEnabled ? 'Auto-insights ON' : 'Manual mode'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAutoSuggestions}
              title="Toggle auto-suggestions"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              title="Clear chat history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-64 pr-4" ref={scrollRef}>
          {loadingHistory ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-muted-foreground">Loading chat history...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {chatHistory.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 p-3 rounded-lg",
                    message.role === 'user' 
                      ? "bg-primary/10 ml-8" 
                      : "bg-muted/50 mr-8"
                  )}
                >
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 mt-0.5" />
                    ) : (
                      <Bot className="h-4 w-4 mt-0.5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(message.created_at)}
                      {message.sensor_data && (
                        <span className="ml-2">
                          • {message.sensor_data.deviceCount} devices analyzed
                        </span>
                      )}
                      {message.tokens_used && (
                        <span className="ml-2">
                          • {message.tokens_used} tokens
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 p-3 rounded-lg bg-muted/50 mr-8">
                  <Bot className="h-4 w-4 mt-0.5 text-primary" />
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your plants, sensors, or growing conditions..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            // disabled={isLoading || loadingHistory}
            disabled={true}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading || loadingHistory}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {lastSuggestionTime && autoSuggestionsEnabled && (
          <div className="text-xs text-muted-foreground text-center">
            Next auto-suggestion in {Math.max(0, Math.ceil((suggestionInterval * 60 * 60 * 1000 - (Date.now() - lastSuggestionTime.getTime())) / (60 * 1000)))} minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
}
