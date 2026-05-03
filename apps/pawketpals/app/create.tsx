import { ScreenLayout } from '../src/components/ScreenLayout';
import { Header } from '../src/components/Header';
import { SectionCard } from '../src/components/SectionCard';
import { InlineCTA } from '../src/components/InlineCTA';

export default function CreatePalScreen() {
  return (
    <ScreenLayout>
      <Header
        title="Create a Pawket Pal"
        subtitle="Bring a real pet story into the Park — and give it a companion form."
      />

      <SectionCard
        title="Story Basics"
        description="Rescue, adoption, foster, memorial — every story is welcome. Keep it short for now."
      >
        <InlineCTA actions={[{ label: 'Start Draft (placeholder)', variant: 'secondary', onPress: () => {} }]} />
      </SectionCard>

      <SectionCard
        title="Photo & Style (Coming Soon)"
        description="Soon you’ll upload a photo and customize the look — species, palette, accessories, vibe."
      >
        <InlineCTA actions={[{ label: 'Browse Featured Pals', href: '/pals', variant: 'primary' }]} />
      </SectionCard>

      <SectionCard
        title="How It Becomes a Pal"
        description="Your story becomes a companion with personality tags, bond rituals, and shareable moments — built to feel alive, not generic."
      >
        <InlineCTA
          actions={[
            { label: 'Enter Pawket Park', href: '/park', variant: 'primary' },
            { label: 'Visit Town Square', href: '/town', variant: 'secondary' }
          ]}
        />
      </SectionCard>
    </ScreenLayout>
  );
}
