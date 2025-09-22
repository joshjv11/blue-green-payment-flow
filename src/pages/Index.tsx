import Header from "@/components/Header";
import EnhancedHero from "@/components/EnhancedHero";
import EnhancedFeatures from "@/components/EnhancedFeatures";
import SetupCallCTA from "@/components/SetupCallCTA";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Header />
      <EnhancedHero />
      <EnhancedFeatures />
      <SetupCallCTA />
    </main>
  );
};

export default Index;