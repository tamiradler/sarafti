export default function PrivacyPage() {
  return (
    <article className="prose max-w-3xl rounded-xl border border-border bg-surface p-6 prose-headings:text-text prose-p:text-muted">
      <h1>Privacy Policy</h1>
      <p>
        Sarafti stores account profile information from Google OAuth (name, email, avatar), user submissions, and abuse
        prevention metadata such as rate limiting identifiers.
      </p>
      <p>
        Data is used to display aggregated trends, enforce one-submission-per-user-per-restaurant rules, and maintain
        platform safety.
      </p>
      <p>
        Free-text inputs are checked by automated moderation before they can appear in public aggregates.
      </p>
    </article>
  );
}
