import { Card } from '@/components/ui/card';

interface GoogleSlideRendererProps {
  slide: {
    id: number;
    type: 'title' | 'section' | 'content' | 'two-column' | 'cta';
    title?: string;
    subtitle?: string;
    bullets?: string[];
    leftContent?: string;
    rightContent?: string;
    buttonText?: string;
    background?: string;
    accent?: string;
  };
}

export function GoogleSlideRenderer({ slide }: GoogleSlideRendererProps) {
  const renderSlideContent = () => {
    switch (slide.type) {
      case 'title':
        return (
          <div 
            className="h-full flex flex-col items-center justify-center text-white p-12"
            style={{ backgroundColor: slide.background || 'var(--google-blue)' }}
          >
            <h1 className="text-6xl font-bold font-google mb-6 text-center">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="text-2xl font-google text-white/90 text-center">
                {slide.subtitle}
              </p>
            )}
          </div>
        );

      case 'section':
        return (
          <div 
            className="h-full flex items-center justify-center p-12"
            style={{ 
              backgroundColor: slide.background || '#fff',
              borderLeft: `12px solid ${slide.accent || 'var(--google-green)'}` 
            }}
          >
            <h2 
              className="text-5xl font-bold font-google"
              style={{ color: slide.accent || 'var(--google-green)' }}
            >
              {slide.title}
            </h2>
          </div>
        );

      case 'content':
        return (
          <div className="h-full bg-white p-12 flex flex-col">
            <h2 
              className="text-4xl font-bold font-google mb-8"
              style={{ color: slide.accent || 'var(--google-blue)' }}
            >
              {slide.title}
            </h2>
            <ul className="space-y-4 flex-1">
              {slide.bullets?.map((bullet, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div 
                    className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: slide.accent || 'var(--google-blue)' }}
                  />
                  <span className="text-2xl font-google text-gray-700 leading-relaxed">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );

      case 'two-column':
        return (
          <div className="h-full bg-white p-12 flex flex-col">
            <h2 
              className="text-4xl font-bold font-google mb-8"
              style={{ color: slide.accent || 'var(--google-blue)' }}
            >
              {slide.title}
            </h2>
            <div className="flex gap-8 flex-1">
              <div className="flex-1 p-6 bg-gray-50 rounded-lg">
                <p className="text-xl font-google text-gray-700">
                  {slide.leftContent}
                </p>
              </div>
              <div className="flex-1 p-6 bg-gray-50 rounded-lg">
                <p className="text-xl font-google text-gray-700">
                  {slide.rightContent}
                </p>
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div 
            className="h-full flex flex-col items-center justify-center text-white p-12"
            style={{ backgroundColor: slide.background || 'var(--google-red)' }}
          >
            <h2 className="text-5xl font-bold font-google mb-8 text-center">
              {slide.title}
            </h2>
            {slide.buttonText && (
              <button
                className="px-12 py-4 bg-white text-2xl font-bold font-google rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                style={{ color: slide.background || 'var(--google-red)' }}
              >
                {slide.buttonText}
              </button>
            )}
          </div>
        );

      default:
        return (
          <div className="h-full bg-white p-12 flex items-center justify-center">
            <p className="text-2xl font-google text-gray-400">Unknown slide type</p>
          </div>
        );
    }
  };

  return (
    <Card className="w-full aspect-video overflow-hidden shadow-2xl">
      {renderSlideContent()}
    </Card>
  );
}