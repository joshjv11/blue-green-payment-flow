import Header from "@/components/Header";
import EnhancedHero from "@/components/EnhancedHero";
import EnhancedFeatures from "@/components/EnhancedFeatures";
import CallToAction from "@/components/CallToAction";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Header />
      <EnhancedHero />
      <EnhancedFeatures />
      <CallToAction />
    </main>
  );
};

export default Index;