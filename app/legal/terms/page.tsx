import type { Metadata } from 'next';
import LegalDoc, { H2, P } from '../LegalDoc';

export const metadata: Metadata = {
  title: 'Terms of Use — Astroli',
  description: 'Terms of Use for the Astroli family learning platform (draft).',
};

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Use">
      <P>
        These Terms of Use govern your use of Astroli, an AI-assisted learning platform.
        Astroli is offered to families: a parent or legal guardian (&ldquo;you&rdquo;) creates
        an account and sets up access for one child. By using Astroli you agree to these terms
        on your own behalf and, where you set up access for a child, on the child&rsquo;s behalf.
      </P>

      <H2>1. Who may use Astroli</H2>
      <P>
        In the family track, the account holder must be the parent or legal guardian of the child
        being enrolled. You confirm that you have the authority to consent to the child&rsquo;s use
        of the service and to the handling of the child&rsquo;s information described in our{' '}
        Privacy Policy. Astroli&rsquo;s family experience is designed for children aged 13 and older.
      </P>

      <H2>2. What Astroli does</H2>
      <P>
        Astroli gives your child an AI companion (&ldquo;Orin&rdquo;) that holds learning
        conversations, guides them through missions, and remembers their progress so they can
        continue where they left off. The AI generates responses automatically; it is a learning
        tool, not a human teacher, and it can occasionally be wrong. Astroli is not a substitute
        for professional, medical, legal, or crisis support.
      </P>

      <H2>3. Parental consent</H2>
      <P>
        Before your child is invited, you complete a consent step describing what your child will
        use and what data is stored. Your child cannot sign in until that consent is recorded. If
        we materially change how the service works or how data is handled &mdash; for example, when
        we add an optional voice feature &mdash; we will ask you to review and consent again before
        the affected capability applies to your child.
      </P>

      <H2>4. Your child&rsquo;s account</H2>
      <P>
        You are responsible for the account you set up and for supervising your child&rsquo;s use as
        you see fit. Keep sign-in access secure. Tell us if you believe the account has been used by
        someone other than your child.
      </P>

      <H2>5. Acceptable use</H2>
      <P>
        Don&rsquo;t use Astroli to break the law, to harass others, to attempt to extract other
        users&rsquo; data, or to interfere with the service. We may suspend accounts that do.
      </P>

      <H2>6. Content and intellectual property</H2>
      <P>
        Astroli and its content are owned by us or our licensors. Work your child produces in the
        course of learning belongs to your family. We may use de-identified, aggregated information
        to improve the product, consistent with the Privacy Policy.
      </P>

      <H2>7. Service changes, disclaimers, and liability</H2>
      <P>
        Astroli is provided on an &ldquo;as is&rdquo; basis during this pilot. We may change or
        discontinue features. To the extent permitted by law, we are not liable for indirect or
        incidental damages. Nothing in these terms limits rights that cannot be limited under
        applicable law, including the rights of children and their parents.
      </P>

      <H2>8. Contact</H2>
      <P>
        Questions about these terms or your child&rsquo;s data? Contact the founder directly through
        the support channel provided in your onboarding email.
      </P>

      <P>
        <em>
          This is a draft. Final, attorney-reviewed terms will replace this document before Astroli
          is offered to the public.
        </em>
      </P>
    </LegalDoc>
  );
}
