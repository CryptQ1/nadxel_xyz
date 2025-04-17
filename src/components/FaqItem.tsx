'use client';

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function FaqItem({ question, answer, isOpen, onToggle }: FaqItemProps) {
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={onToggle}>
        {question}
      </button>
      <div className="faq-answer" style={{ display: isOpen ? 'block' : 'none' }}>
        {answer}
      </div>
    </div>
  );
}