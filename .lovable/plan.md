## Add Surgical Consent Form (English + Urdu, Printable)

Add a new "Consent" feature to the LUMHS Care Connect app (`public/ward.html`) that lets the doctor generate, fill, save, and print a hospital surgical consent form per patient.

### Where it lives
- New button on the patient detail screen ("Consent Form") next to existing actions (Operative Note / Handover).
- Opens a modal/subpage `#sub-consent` with the editable form pre-filled from patient data (Name, Age, Sex, MR No., Ward/Bed, Diagnosis, Proposed Operation, Surgeon).
- Editable fields: Patient/Guardian Name, Relationship, Date, Time, Witness Name, Doctor Name (defaults to logged-in user), plus free-text for procedure-specific risks.
- Saved to the patient record (`patient.consent`) and synced via existing Lovable Cloud sync.

### Content (trimmed from the uploaded template, kept clinically important)
- Header: "Hospital Surgical Consent Form / رضا نامہ برائے آپریشن" with LUMHS Jamshoro — Department of Surgery.
- Patient demographics block (auto-filled).
- Diagnosis + Proposed Operation + Surgeon (auto-filled, editable).
- Consent statement in **English + Urdu** covering: nature of disease, procedure, benefits, risks, complications, anesthesia risks, alternatives, consequences of refusing — patient had opportunity to ask questions and voluntarily consents. (Trim duplicated/garbled Urdu fragments from original; use clean Urdu sentence.)
- Specific risks/complications discussed (free-text, with common defaults: bleeding, infection, anesthesia reaction, DVT, conversion to open, need for further surgery).
- Signature block: Patient/Guardian name, Relationship, Signature/Thumb impression line.
- Date, Time, Witness name+signature, Doctor name+signature lines.
- Footer credit: Dr. Noorullah Ahmed, LUMHS Jamshoro.

### Print support
- A dedicated print stylesheet block (`@media print`) that:
  - Hides app chrome (navbars, buttons, other screens).
  - Shows only `#consent-printable` on A4 with proper margins.
  - Uses serif/system font, black on white, clean borders, signature lines as underlines.
  - Supports Urdu rendering (font-family includes `'Noto Nastaliq Urdu', 'Jameel Noori Nastaliq', serif` with `direction: rtl` on Urdu spans).
- "Print / Save as PDF" button triggers `window.print()`.

### Data model
- Add to patient object: `consent: { patientGuardianName, relationship, risksDiscussed, date, time, witnessName, doctorName, signedAt }`.
- Add to `FIELDS` for persistence + sync.

### Implementation steps
1. Add Urdu webfont link in `<head>` (Google Fonts Noto Nastaliq Urdu).
2. Add `#sub-consent` subpage HTML with form inputs + a hidden-on-screen `#consent-printable` preview that mirrors final layout.
3. Add CSS: screen styles for the form editor + `@media print` rules.
4. Add "Consent Form" button on patient detail screen.
5. JS: `openConsent(patientId)` prefills fields, `saveConsent()` persists via existing `saveStore()` + `pushToFirebase()`, `printConsent()` calls `window.print()`.
6. Keep all logic inside `public/ward.html` (single-file app pattern).

No backend changes, no new dependencies, no route changes.