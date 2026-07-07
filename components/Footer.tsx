import T from "@/components/T";

export default function Footer() {
  return (
    <footer className="border-t border-brand-bg mt-8">
      <div className="max-w-5xl mx-auto px-4 py-6 text-sm text-brand-gray flex flex-col items-center gap-1">
        <span className="font-medium">
          <T k="contact" />
        </span>
        <a href="mailto:waller9929@gmail.com" className="text-brand-blue hover:underline">
          waller9929@gmail.com
        </a>
      </div>
    </footer>
  );
}
