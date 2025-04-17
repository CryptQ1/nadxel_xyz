'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ParticleCanvas from './ParticleCanvas';
import FaqItem from './FaqItem';
import { useRouter } from 'next/navigation';

export default function MainPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();

  const handlePlayNow = () => {
    console.log('Play Now clicked, navigating to /game');
    window.open('/game', '_blank', 'width=500,height=1000');
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqItems = [
    { question: 'Question 1', answer: 'Answer 1 (Content to be added later)' },
    { question: 'Question 2', answer: 'Answer 2 (Content to be added later)' },
    { question: 'Question 3', answer: 'Answer 3 (Content to be added later)' },
    { question: 'Question 4', answer: 'Answer 4 (Content to be added later)' },
    { question: 'Question 5', answer: 'Answer 5 (Content to be added later)' },
  ];

  return (
    <div className="App">
      <div className="background-animation"></div>
      <ParticleCanvas />
      <header className="header">
        <div className="logo-container">
          <Image
            src="/nadxel.png"
            alt="Logo"
            className="logo-image"
            width={200}
            height={70}
          />
        </div>
      </header>
      <main className="main-section">
        <div className="button-container">
          <p>PLAY or APPLY for Whitelist !</p>
        </div>
        <div className="button-container">
          <button className="coming-soon-btn" onClick={() => router.push('/game')} >Play(soon)</button>
          <Link href="https://forms.gle/rhqhfiLyHaR2hhdy5" target="_blank">
            <button className="coming-soon-btn">Apply</button>
          </Link>
        </div>
        <div id="info-section">
          <div id="animation-area">
            <Image
              src="/111.png"
              alt="Image1"
              className="animation-area-img"
              width={300}
              height={300}
            />
            <Image
              src="/222.png"
              alt="Image2"
              className="animation-area-img"
              width={300}
              height={300}
            />
            <Image
              src="/333.png"
              alt="Image3"
              className="animation-area-img"
              width={300}
              height={300}
            />
            <Image
              src="/444.png"
              alt="Image4"
              className="animation-area-img"
              width={300}
              height={300}
            />
          </div>
          <div id="text-area">
            <p>
              Yo FRENS,
              <br />
              <br />
              What’s good? It’s your crew from the NAD gang, and we’re hyped to
              drop some big news—welcome to the Nadxel fam! Out of a massive pool
              of dreamers and builders, you made the cut. So, give yourself a pat
              on the back—you’re officially part of something dope.
              <br />
              <br />
              Nadxel isn’t just another project; it’s a whole mood. We’re building
              a tight-knit crew of innovators, creators, and straight-up curious
              folks who wanna push boundaries and have a blast doing it. Think of
              it as a clubhouse for the future, where big ideas meet good times.
              And here’s the kicker: we’re powered by Monad, the slickest Layer 1
              out there ( lightning-fast transactions, crazy scalability, and all
              the freedom to build without hitting a wall).
              <br />
              <br />
              What’s Nadxel all about? It’s your spot to connect, create, and flex
              those skills in a community that’s as real as it gets. Whether
              you’re cooking up NFTs, diving into DeFi, or just vibing with new
              tech, we’ve got the tools and the homies to make it happen.
              <br />
              <br />
              Let’s build the future together, fam. Nadxel’s just getting started,
              and with you on board, it’s about to be legendary.
              <br />
              Peace,
              <br />
              <br />
              The Nadxel Squad
            </p>
          </div>
        </div>
      </main>
      <div id="social-links">
        <Link
          href="https://x.com/nadxel_xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="social-text"
        >
          TWITTER(X)
        </Link>
        <Link
          href="https://discord.com"
          target="_blank"
          rel="noopener noreferrer"
          className="social-text discord-link"
        ></Link>
      </div>
      <div id="scroll-section">
        <div id="scroll-content">
          <span id="scroll-text">Coming Soon!</span>
        </div>
      </div>
      <div id="faq-section">
        <h2>FAQ</h2>
        {faqItems.map((item, index) => (
          <FaqItem
            key={index}
            question={item.question}
            answer={item.answer}
            isOpen={openFaq === index}
            onToggle={() => toggleFaq(index)}
          />
        ))}
      </div>
      <div id="extended-section">
        <div id="footer">
          <span>Build on Monad</span>
        </div>
      </div>
    </div>
  );
}