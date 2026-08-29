import { MemoryStore } from "../config/database";

const CHAT_KEYS: Record<string, string> = {
  services: "We offer herbal consultations, laboratory tests, herbal products, online booking, diagnostic scans, telemedicine, physiotherapy, private and general wards, and community clinic-on-wheels services.",
  location: "We are at Odorkor Official Town & Mankessim - Bafikrom. Branches in Tema and Kumasi. 📍",
  located: "We are at Odorkor Official Town & Mankessim - Bafikrom. Branches in Tema and Kumasi. 📍",
  ceo: "The CEO of Edu Herbal Clinic is Dr. Edu Mohammed.",
  open: "We are open Mon–Fri 8 AM–6 PM and Saturday 9 AM–3 PM. Closed Sundays. 🕗",
  hours: "Opening hours: Mon–Fri 8 AM–6 PM · Saturday 9 AM–3 PM · Sunday Closed.",
  consultation: "Initial consultation: GHS 250 (adults) · GHS 180 (children under 12). Follow-ups: GHS 150.",
  fee: "Initial consultation: GHS 250 (adults) · GHS 180 (children). Follow-ups: GHS 150.",
  price: "Herbal products range GHS 30–70. Consultations start at GHS 150.",
  cost: "Initial consultation: GHS 250 (adults) · GHS 180 (children). Follow-ups: GHS 150.",
  book: "Book online via our booking form, or WhatsApp +233 055 837 9545. 📅",
  appointment: "Use our online booking form on our website, or WhatsApp +233 055 837 9545. 📅",
  kidney: "We provide assessment and herbal care support for kidney and prostate concerns. Please consult a practitioner for an individual treatment plan.",
  prostate: "We provide assessment and herbal care support for kidney and prostate concerns. Please consult a practitioner for an individual treatment plan.",
  infertility: "We provide consultations for infertility and sexual weakness. A practitioner will assess the individual situation and recommend appropriate care.",
  sexual: "We provide consultations for infertility and sexual weakness. A practitioner will assess the individual situation and recommend appropriate care.",
  sciatica: "Yes, we offer care for sciatica and related pain, including physiotherapy support. Please book a consultation for an assessment.",
  malaria: "Yes, malaria is one of the conditions we support with Edhec Malacure. If symptoms are severe, please visit our clinic.",
  asthma: "We offer consultations for asthma and respiratory concerns. Please seek urgent medical care for severe breathing difficulty.",
  diabetes: "We offer herbal care support for Type 2 Diabetes. A practitioner should review your condition and current medicines before recommending a plan.",
  stroke: "We offer post-stroke rehabilitation support led by Dr. Opoku and Dr. Edu Mohammed.",
  hypertension: "We offer herbal care support for hypertension. A practitioner should review your readings before recommending a plan.",
  cancer: "We offer supportive consultations for people living with cancer. Please speak with our medical team.",
  safe: "Our herbal products are FDA approved and made with natural organic ingredients.",
  deliver: "Yes, delivery can be arranged across Ghana depending on your location.",
  delivery: "Delivery charges depend on your location. The clinic team will confirm the exact fee before dispatch.",
  contact: "You can contact us through WhatsApp at +233 055 837 9545 or call the clinic for assistance.",
  default: "Thank you for reaching out! For detailed medical queries, our team is also available directly on WhatsApp at +233 055 837 9545. 🌿",
};

export class EduBotService {
  public static isHandoverRequested(text: string): boolean {
    const lower = text.toLowerCase();
    return /\b(talk|speak|chat|connect|contact)\b.*\b(someone|person|human|agent|staff|doctor|practitioner|admin|administrator|clinic team)\b|\b(someone|person|human|agent|staff|doctor|practitioner|admin|administrator|clinic team)\b.*\b(talk|speak|chat|connect|contact)\b/i.test(lower);
  }

  public static generateResponse(message: string, patientName: string): { reply: string; handoverRequested: boolean } {
    const lower = message.toLowerCase().trim();
    const handover = this.isHandoverRequested(message);

    if (handover) {
      return {
        reply: "I have handed your chat over to our clinic team. A staff member will review your message and contact you using the authenticated details provided.",
        handoverRequested: true,
      };
    }

    if (/\b(product|products|medicine|medicines|herbal)\b/i.test(lower)) {
      const productNames = MemoryStore.products.map((p) => p.name).join(", ");
      return {
        reply: `We have the following FDA-approved herbal medicines available: ${productNames}. You can order them through our catalog.`,
        handoverRequested: false,
      };
    }

    const matchedKey = Object.keys(CHAT_KEYS).find((key) => lower.includes(key));
    const reply = matchedKey ? CHAT_KEYS[matchedKey] : CHAT_KEYS.default;

    return {
      reply,
      handoverRequested: false,
    };
  }
}
