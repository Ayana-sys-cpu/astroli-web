import type { Metadata } from 'next';
import LegalDoc, { H2, P } from '../LegalDoc';

export const metadata: Metadata = {
  title: 'Privacy Policy — Astroli',
  description: 'Privacy Policy for the Astroli family learning platform (draft).',
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy">
      <P>
        This Privacy Policy explains what information Astroli collects about a child using the
        family track, how it is used, who it is shared with, and how long it is kept. In the family
        track, the parent or legal guardian sets up the account and is the person who consents to
        this handling on the child&rsquo;s behalf. It is written to be readable by a parent, not a
        lawyer.
      </P>

      <H2>1. Whose data this covers</H2>
      <P>
        Two people are involved: the <strong>parent</strong> who creates and pays for the account,
        and the <strong>child</strong> (aged 13+) who does the learning. This policy focuses on the
        child&rsquo;s learning data, because protecting a minor&rsquo;s information is the point.
      </P>

      <H2>2. What we collect</H2>
      <P>
        <strong>Account information:</strong> the parent&rsquo;s email (via Google sign-in), and the
        child&rsquo;s email and first name used to create their space.
      </P>
      <P>
        <strong>Learning data:</strong> the child&rsquo;s conversations with the AI companion, the
        missions they work on, and their progress. This is stored so the child can continue where
        they left off and so the parent can see meaningful progress signals.
      </P>
      <P>
        <strong>Consent records:</strong> a record of which parent consented, to which version of
        these terms, to which items, and when. We keep this to prove consent was given; it does not
        include your IP address.
      </P>
      <P>
        <strong>Voice (planned, not yet active):</strong> when the optional voice feature ships and
        you separately consent to it, the child&rsquo;s spoken audio would be captured to let them
        talk with the AI. Until that feature is enabled and you consent, no voice audio is recorded.
      </P>

      <H2>3. The AI and voice vendors who process child data</H2>
      <P>
        Astroli uses trusted third-party AI providers to power the learning experience. We share
        only what is needed for the feature to work, under a written data processing agreement with
        each vendor:
      </P>
      <P>
        <strong>Anthropic</strong> (today) &mdash; powers the AI companion&rsquo;s conversations.
        The text of the child&rsquo;s messages is sent to Anthropic to generate a reply. Under our
        agreement, this data is not used to train their models.
      </P>
      <P>
        <strong>Speech providers such as OpenAI and/or ElevenLabs</strong> (only when the voice
        feature ships) &mdash; would convert the child&rsquo;s speech to text and generate spoken
        replies. Voice audio would be sent to the speech provider to do this, under a data
        processing agreement, and only after you separately consent to voice.
      </P>

      <H2>4. How long we keep it</H2>
      <P>
        Learning conversations and progress are kept for as long as the account is active so the
        experience stays continuous. Data sent to our AI vendors is retained by them only for the
        limited period allowed under our agreement (generally up to 30 days for abuse monitoring,
        then deleted) and is not used to train their models. If you close the account, the
        child&rsquo;s learning data is deleted or de-identified.
      </P>

      <H2>5. What we do not do</H2>
      <P>
        We do not sell your child&rsquo;s data. We do not show third-party advertising to children.
        We do not use the child&rsquo;s conversations to train AI models. We collect the minimum
        needed to run the learning experience.
      </P>

      <H2>6. Your choices as the parent</H2>
      <P>
        You can review what your child is doing from your parent dashboard, ask us to delete your
        child&rsquo;s data, and withdraw your consent by contacting us (withdrawing consent means
        the child can no longer use the affected features). When a new policy version is published,
        you will be asked to review and consent again before affected features continue.
      </P>

      <H2>7. Legal basis and children</H2>
      <P>
        Because the users are minors, the parent&rsquo;s specific, informed consent is the basis on
        which we process the child&rsquo;s data. We aim to meet the standards of COPPA, FERPA, and
        GDPR, and applicable US state laws covering voice and biometric data. This platform is
        intended for children aged 13 and older; we do not knowingly create accounts for children
        under 13.
      </P>

      <H2>8. Contact</H2>
      <P>
        To ask a question, request deletion, or withdraw consent, contact the founder through the
        support channel provided in your onboarding email.
      </P>

      <P>
        <em>
          This is a draft. Vendor names, retention periods, and legal language are subject to change
          and must be reviewed by a qualified attorney before Astroli is offered to the public.
        </em>
      </P>
    </LegalDoc>
  );
}
