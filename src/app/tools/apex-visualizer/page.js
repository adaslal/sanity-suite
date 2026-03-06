import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ApexVisualizerTool from '@/components/ApexVisualizerTool';

export const metadata = {
  title: 'Free Apex Visualizer — Paste Apex, See the Flowchart | Sanity Suite',
  description:
    'Paste any Salesforce Apex class and instantly see its control flow as an interactive flowchart. Free, no login, 100% client-side. Download as PNG or SVG.',
  keywords: [
    'Apex Visualizer',
    'Salesforce Apex',
    'Apex Flowchart',
    'Apex Control Flow',
    'Salesforce Developer Tool',
    'Free Salesforce Tool',
    'Mermaid.js',
    'Apex Class Diagram',
  ],
  openGraph: {
    title: 'Free Apex Visualizer — Paste Apex, See the Flowchart',
    description:
      'Visualize any Apex class as an interactive flowchart. Free, no login, runs in your browser. Built by the makers of Sanity Suite.',
    url: 'https://sanity-suite.vercel.app/tools/apex-visualizer',
    siteName: 'Sanity Suite',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Apex Visualizer — Paste Apex, See the Flowchart',
    description:
      'Visualize any Apex class as an interactive flowchart. Free, no login, runs in your browser.',
  },
};

export default function ApexVisualizerPage() {
  return (
    <>
      <Header />
      <main>
        <ApexVisualizerTool />
      </main>
      <Footer />
    </>
  );
}
