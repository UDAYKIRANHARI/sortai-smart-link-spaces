import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';

interface FeedbackModalProps {
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}

export default function FeedbackModal({ onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    // Simulate network delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        onSubmit(rating, feedback);
      }, 2000); // Close after 2s of showing thank you
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in px-4">
      <div className="relative w-full max-w-sm bg-sortai-jet border border-sortai-slate/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header gradient line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500" />
        
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-sortai-white/[0.05] text-sortai-slate hover:text-sortai-white hover:bg-sortai-white/[0.1] transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center py-6 animate-fade-in text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-emerald-400 fill-emerald-400" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-sortai-white mb-2">
                Thank you!
              </h3>
              <p className="text-sm text-sortai-silver">
                We really appreciate your feedback. It helps us make SortAi better.
              </p>
            </div>
          ) : (
            <>
              <h3 className="font-heading text-lg font-semibold text-sortai-white mb-2 text-center mt-2">
                How's your experience?
              </h3>
          <p className="text-sm text-sortai-slate text-center mb-6">
            You just classified your first link! We'd love to know what you think of SortAi so far.
          </p>

          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 ${
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-sortai-slate/40'
                  } transition-colors duration-200`}
                />
              </button>
            ))}
          </div>

          {/* Optional Text Feedback */}
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Any suggestions or thoughts? (Optional)"
            className="w-full h-24 bg-sortai-black border border-sortai-slate/20 rounded-xl p-3 text-sm text-sortai-pale placeholder:text-sortai-slate/50 focus:outline-none focus:border-sortai-slate/50 resize-none mb-6"
          />

          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="w-full py-3 rounded-xl bg-sortai-white text-sortai-black font-semibold flex items-center justify-center gap-2
                       hover:bg-sortai-silver disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-sortai-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Submit Feedback
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
          
          <button 
            onClick={onClose}
            className="w-full mt-3 py-2 text-xs text-sortai-slate hover:text-sortai-silver transition-colors"
          >
            Maybe later
          </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
