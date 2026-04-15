import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Loader2 } from "lucide-react";
import { submitToCRM, type WebsiteFormData } from "@/lib/crmIntegration";

export default function Quote() {
  const initialFormData: WebsiteFormData = {
    fullName: "",
    email: "",
    phone: "",
    contactMethod: "Either",
    projectType: "",
    buildingPurpose: "",
    city: "",
    state: "",
    zipCode: "",
    startTiming: "ASAP",
    structureType: "",
    length: "",
    width: "",
    height: "",
    roofStyle: "Not sure",
    doors: "",
    insulation: "None",
    sitePrepared: "Not sure",
    foundation: "Not sure",
    budget: "Under $50k",
    additionalNotes: "",
    agree: false,
  };

  const [formData, setFormData] = useState<WebsiteFormData>(initialFormData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.projectType) newErrors.projectType = "Project type is required";
    if (!formData.structureType) newErrors.structureType = "Structure type is required";
    if (!formData.agree) newErrors.agree = "You must agree to be contacted";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitToCRM(formData);
      console.log("Lead created:", result.leadId);
      setSubmitSuccess(true);
      setFormData(initialFormData);
    } catch (error) {
      console.error("Failed to submit quote:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit your request. Please try again or call us directly."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-background">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 tracking-tight" data-testid="text-quote-hero">
              Get a Quote for Your Steel Building
            </h1>
            <p className="text-xl text-muted-foreground mb-3">
              We specialize in cold-formed steel (C-channel) and red iron buildings.
            </p>
            <p className="text-lg text-muted-foreground font-medium">
              Fill out the form below and we'll respond within 1 business day.
            </p>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center" data-testid="step-1">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2">Tell us about your project</h3>
                <p className="text-muted-foreground">Share your project details and building requirements</p>
              </div>
              <div className="text-center" data-testid="step-2">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold mb-2">We design and price your building</h3>
                <p className="text-muted-foreground">Our team engineers and prices your custom steel structure</p>
              </div>
              <div className="text-center" data-testid="step-3">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold mb-2">You review and approve</h3>
                <p className="text-muted-foreground">Review the quote and move forward or discuss options</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Quote Form */}
        <section className="py-20 bg-background">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-8 lg:p-12 shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-10" data-testid="form-quote">
                {/* Contact Info Section */}
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-primary">Contact Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        placeholder="John Smith"
                        data-testid="input-fullname"
                      />
                      {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        placeholder="john@example.com"
                        data-testid="input-email"
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        placeholder="(555) 123-4567"
                        data-testid="input-phone"
                      />
                      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Preferred Contact Method</label>
                      <select
                        name="contactMethod"
                        value={formData.contactMethod}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        data-testid="select-contact-method"
                      >
                        <option value="Phone">Phone</option>
                        <option value="Email">Email</option>
                        <option value="Either">Either</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Project Basics Section */}
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-primary">Project Basics</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Project Type *</label>
                      <select
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        data-testid="select-project-type"
                      >
                        <option value="">Select a project type</option>
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Agricultural">Agricultural</option>
                        <option value="Community">Community</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.projectType && <p className="text-red-500 text-sm mt-1">{errors.projectType}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Building Purpose</label>
                      <input
                        type="text"
                        name="buildingPurpose"
                        value={formData.buildingPurpose}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        placeholder="e.g., Warehouse, Equipment Storage, Home"
                        data-testid="input-building-purpose"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">City</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                          placeholder="City"
                          data-testid="input-city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">State</label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                          placeholder="State"
                          data-testid="input-state"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">ZIP Code</label>
                        <input
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                          placeholder="ZIP"
                          data-testid="input-zip"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Desired Start Timing</label>
                      <select
                        name="startTiming"
                        value={formData.startTiming}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        data-testid="select-start-timing"
                      >
                        <option value="ASAP">ASAP</option>
                        <option value="1-3 months">1–3 months</option>
                        <option value="3-6 months">3–6 months</option>
                        <option value="6+ months">6+ months</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Structure Type Section */}
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-primary">Structure Type</h2>
                  <div className="space-y-3">
                    <label className="flex items-center cursor-pointer" data-testid="radio-cold-formed">
                      <input
                        type="radio"
                        name="structureType"
                        value="Cold-formed steel (C-channel)"
                        checked={formData.structureType === "Cold-formed steel (C-channel)"}
                        onChange={handleChange}
                        className="w-4 h-4 mr-3"
                      />
                      <span className="font-medium">Cold-formed steel (C-channel)</span>
                    </label>
                    <label className="flex items-center cursor-pointer" data-testid="radio-red-iron">
                      <input
                        type="radio"
                        name="structureType"
                        value="Red iron"
                        checked={formData.structureType === "Red iron"}
                        onChange={handleChange}
                        className="w-4 h-4 mr-3"
                      />
                      <span className="font-medium">Red iron</span>
                    </label>
                    <label className="flex items-center cursor-pointer" data-testid="radio-not-sure">
                      <input
                        type="radio"
                        name="structureType"
                        value="Not sure – help me choose"
                        checked={formData.structureType === "Not sure – help me choose"}
                        onChange={handleChange}
                        className="w-4 h-4 mr-3"
                      />
                      <span className="font-medium">Not sure – help me choose</span>
                    </label>
                  </div>
                  {errors.structureType && <p className="text-red-500 text-sm mt-3">{errors.structureType}</p>}
                </div>

                {/* Size & Features Section */}
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-primary">Size & Features</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-3">Approximate Building Size</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <input
                            type="number"
                            name="length"
                            value={formData.length}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            placeholder="Length"
                            data-testid="input-length"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Length (ft)</p>
                        </div>
                        <div>
                          <input
                            type="number"
                            name="width"
                            value={formData.width}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            placeholder="Width"
                            data-testid="input-width"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Width (ft)</p>
                        </div>
                        <div>
                          <input
                            type="number"
                            name="height"
                            value={formData.height}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            placeholder="Height"
                            data-testid="input-height"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Height (ft)</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Roof Style</label>
                      <select
                        name="roofStyle"
                        value={formData.roofStyle}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        data-testid="select-roof-style"
                      >
                        <option value="Gable">Gable</option>
                        <option value="Single slope">Single slope</option>
                        <option value="Not sure">Not sure</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Doors & Openings</label>
                      <textarea
                        name="doors"
                        value={formData.doors}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
                        rows={3}
                        placeholder="e.g., Overhead doors, Walk doors, Windows, etc."
                        data-testid="textarea-doors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Insulation / Energy Efficiency</label>
                      <select
                        name="insulation"
                        value={formData.insulation}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        data-testid="select-insulation"
                      >
                        <option value="None">None</option>
                        <option value="Basic">Basic</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Site Conditions Section */}
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-primary">Site Conditions</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Is your site prepared?</label>
                      <select
                        name="sitePrepared"
                        value={formData.sitePrepared}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        data-testid="select-site-prepared"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="In progress">In progress</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Foundation</label>
                      <select
                        name="foundation"
                        value={formData.foundation}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        data-testid="select-foundation"
                      >
                        <option value="Existing slab">Existing slab</option>
                        <option value="Need slab">Need slab</option>
                        <option value="Not sure">Not sure</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Budget & Notes Section */}
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-primary">Budget & Notes</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Budget Range</label>
                      <select
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        data-testid="select-budget"
                      >
                        <option value="Under $50k">Under $50k</option>
                        <option value="$50k–$100k">$50k–$100k</option>
                        <option value="$100k–$250k">$100k–$250k</option>
                        <option value="$250k+">$250k+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Additional Notes</label>
                      <textarea
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
                        rows={4}
                        placeholder="Tell us anything else about your project..."
                        data-testid="textarea-notes"
                      />
                    </div>
                  </div>
                </div>

                {/* Consent & Submit */}
                <div className="border-t pt-8">
                  {submitSuccess ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                      <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                        Thank You!
                      </h3>
                      <p className="text-green-700 dark:text-green-300 mb-4">
                        Your quote request has been submitted successfully. We'll contact you within 1 business day.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSubmitSuccess(false)}
                      >
                        Submit Another Request
                      </Button>
                    </div>
                  ) : (
                    <>
                      <label className="flex items-start cursor-pointer mb-6" data-testid="checkbox-agree">
                        <input
                          type="checkbox"
                          name="agree"
                          checked={formData.agree}
                          onChange={handleChange}
                          className="w-5 h-5 mt-0.5 mr-3 rounded"
                          disabled={isSubmitting}
                        />
                        <span className="font-medium">I agree to be contacted about this project. *</span>
                      </label>
                      {errors.agree && <p className="text-red-500 text-sm mb-4">{errors.agree}</p>}

                      {submitError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                          <p className="text-red-700 dark:text-red-300">{submitError}</p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full font-semibold text-lg h-auto py-4"
                        data-testid="button-submit-quote"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Get My Steel Building Quote
                            <ChevronRight className="ml-2 w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </Card>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Why Choose BuildForge</h2>
            <p className="text-lg text-muted-foreground mb-12 text-center leading-relaxed">
              We use high-quality, 100% American-made steel and professional crews to deliver steel buildings that exceed expectations. Every structure is engineered for durability, performance, and long-term value. We're committed to your project's success from design through installation.
            </p>

            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-border/40" data-testid="faq-1">
                <h3 className="font-bold text-lg mb-2 text-primary">How long does it take to get a quote?</h3>
                <p className="text-muted-foreground">We respond to all quote requests within 1 business day. After reviewing your project details, we'll provide a detailed, customized quote for your steel building.</p>
              </div>

              <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-border/40" data-testid="faq-2">
                <h3 className="font-bold text-lg mb-2 text-primary">Do you build in my area?</h3>
                <p className="text-muted-foreground">We serve customers across the country with cold-formed steel and red iron buildings. Get in touch with your location, and we'll let you know our capabilities and service area.</p>
              </div>

              <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-border/40" data-testid="faq-3">
                <h3 className="font-bold text-lg mb-2 text-primary">Do you handle installation?</h3>
                <p className="text-muted-foreground">Yes, we offer installation services through our professional crew network. We can discuss turnkey solutions or design-only services depending on your needs.</p>
              </div>

              <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-border/40" data-testid="faq-4">
                <h3 className="font-bold text-lg mb-2 text-primary">What's the difference between cold-formed and red iron?</h3>
                <p className="text-muted-foreground">Cold-formed steel uses C-channel profiles for lighter-duty applications with lower costs. Red iron uses heavier I-beams and H-beams for larger spans and higher loads. We help you choose based on your project needs, budget, and performance requirements.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
