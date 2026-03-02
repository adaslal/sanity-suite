import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import VideoDemo from '@/components/VideoDemo';
import Demo from '@/components/Demo';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <VideoDemo />
        <Demo />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
