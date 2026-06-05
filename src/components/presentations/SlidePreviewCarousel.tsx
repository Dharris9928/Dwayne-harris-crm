import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { GoogleSlideRenderer } from './GoogleSlideRenderer';

interface SlidePreviewCarouselProps {
  slides: any[];
}

export function SlidePreviewCarousel({ slides }: SlidePreviewCarouselProps) {
  if (slides.length === 0) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground font-google">No slides generated yet</p>
      </div>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem key={slide.id || index}>
            <GoogleSlideRenderer slide={slide} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}