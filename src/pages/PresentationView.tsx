import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleSlideRenderer } from '@/components/presentations/GoogleSlideRenderer';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export default function PresentationView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [presentation, setPresentation] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!token) {
      setError('No token provided');
      setIsLoading(false);
      return;
    }

    validateAndLoadPresentation();
  }, [token]);

  // Track duration on unmount
  useEffect(() => {
    if (!presentation) return;

    const startTime = Date.now();

    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Log duration
      void supabase.rpc('log_presentation_access', {
        _presentation_id: presentation.id,
        _ip_address: 'tracked',
        _user_agent: navigator.userAgent,
        _duration_seconds: duration,
      });
    };
  }, [presentation]);

  const validateAndLoadPresentation = async () => {
    try {
      const { data, error: validateError } = await supabase.functions.invoke(
        'validate-presentation-token',
        { body: { token } }
      );

      if (validateError || !data?.valid) {
        setError('This presentation link is invalid or has expired');
        setIsLoading(false);
        return;
      }

      setPresentation(data.presentation);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Validation error:', err);
      setError('Failed to load presentation');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold font-google">Access Denied</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline" className="font-google">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const slides = presentation?.slides || [];

  return (
    <div className="h-screen w-screen bg-background flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-gradient-to-b from-background/80 to-transparent">
        <div className="text-sm text-muted-foreground font-google">
          {presentation?.title}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="font-google"
        >
          <X className="h-4 w-4 mr-2" />
          Exit
        </Button>
      </div>

      {/* Slide Viewer */}
      <div className="flex-1 flex items-center justify-center p-8 pt-20 pb-20">
        <Carousel
          className="w-full max-w-6xl"
          opts={{ align: 'center' }}
        >
          <CarouselContent>
            {slides.map((slide: any, index: number) => (
              <CarouselItem key={slide.id || index}>
                <GoogleSlideRenderer slide={slide} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />
        </Carousel>
      </div>

      {/* Footer - Progress Indicator */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent">
        <div className="text-center">
          <div className="text-sm text-muted-foreground font-google">
            {slides.length} slides
          </div>
          <div className="mt-2 h-1 w-full max-w-md mx-auto bg-muted rounded-full">
            <div className="h-full bg-primary" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}