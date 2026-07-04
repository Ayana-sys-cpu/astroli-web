import StarField from '@/components/StarField';
import Nav from './Nav';
import Hero from './Hero';
import MissionConcept from './MissionConcept';
import MissionArchitecture from './MissionArchitecture';
import ScienceOfJoy from './ScienceOfJoy';
import ParadigmShift from './ParadigmShift';
import SignupForm from './SignupForm';
import Footer from './Footer';
import Reveal from './Reveal';

export default function WelcomePage() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <StarField count={90} />
      <Nav />
      <main className="relative">
        <Hero />
        <MissionConcept />
        <MissionArchitecture />
        <ScienceOfJoy />
        <ParadigmShift />

        <section id="signup" className="max-w-[1280px] mx-auto px-6 md:px-16 py-24 md:py-32">
          <Reveal
            className="max-w-2xl mx-auto rounded-[32px] p-8 md:p-14 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 0 60px rgba(139,0,255,0.1)' }}
          >
            <span className="font-space text-[11px] uppercase tracking-[0.24em] text-teal">Free Trial</span>
            <h2 className="font-space font-bold text-3xl md:text-4xl mt-3 mb-4">Start your child&apos;s journey</h2>
            <p className="text-white/60 mb-10 font-inter">
              Register your child for a free trial. We&apos;ll be in touch to set everything up.
            </p>
            <SignupForm />
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
