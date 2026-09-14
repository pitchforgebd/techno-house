import Script from "next/script";
import { getStorefrontChatWidgetTag } from "@/lib/chat/config";

function WhatsAppButton({ number }: { number: string }) {
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="size-7"
        fill="currentColor"
      >
        <path d="M16.004 3C9.377 3 4 8.377 4 15.004c0 2.36.65 4.62 1.883 6.6L4 29l7.59-1.85a11.94 11.94 0 0 0 4.414.84h.005c6.627 0 12.004-5.377 12.004-12.004C28.013 8.377 22.636 3 16.004 3Zm0 21.86h-.004a9.9 9.9 0 0 1-5.05-1.386l-.362-.215-3.75.914 1-3.653-.236-.375a9.86 9.86 0 0 1-1.512-5.14c0-5.462 4.446-9.908 9.918-9.908 2.648 0 5.136 1.032 7.008 2.906a9.84 9.84 0 0 1 2.902 7.006c0 5.462-4.448 9.851-9.914 9.851Zm5.44-7.4c-.298-.15-1.762-.87-2.036-.968-.273-.1-.472-.15-.67.15-.198.298-.767.968-.94 1.167-.173.198-.347.223-.645.075-.298-.15-1.259-.464-2.398-1.48-.887-.79-1.486-1.767-1.66-2.065-.173-.298-.018-.459.13-.607.135-.134.298-.347.446-.52.15-.174.198-.298.298-.497.1-.198.05-.372-.025-.521-.075-.15-.67-1.612-.918-2.208-.242-.582-.487-.503-.67-.512l-.57-.01c-.198 0-.52.075-.792.372-.273.298-1.04 1.017-1.04 2.48 0 1.463 1.065 2.876 1.213 3.075.15.198 2.096 3.2 5.08 4.487.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.762-.72 2.01-1.416.248-.695.248-1.29.174-1.415-.075-.124-.273-.198-.571-.347Z" />
      </svg>
    </a>
  );
}

function MessengerButton({ pageId }: { pageId: string }) {
  return (
    <a
      href={`https://m.me/${pageId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on Messenger"
      className="flex size-14 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-lg transition-transform hover:scale-105"
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="size-7"
        fill="currentColor"
      >
        <path d="M16 3C8.82 3 3 8.373 3 15.001c0 3.782 1.887 7.155 4.833 9.356V29l4.415-2.424c1.18.327 2.436.502 3.752.502 7.18 0 13-5.373 13-12.001C29 8.373 23.18 3 16 3Zm1.29 16.156-3.312-3.53-6.464 3.53 7.108-7.542 3.393 3.53 6.383-3.53-7.108 7.542Z" />
      </svg>
    </a>
  );
}

export async function StorefrontChatWidget() {
  const { tawkPropertyId, tawkWidgetId, whatsappNumber, messengerPageId } =
    await getStorefrontChatWidgetTag();

  return (
    <>
      {tawkPropertyId && tawkWidgetId ? (
        <Script id="th-tawkto" strategy="afterInteractive">
          {`var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/${tawkPropertyId}/${tawkWidgetId}';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();`}
        </Script>
      ) : null}
      {whatsappNumber || messengerPageId ? (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-center gap-3">
          {messengerPageId ? <MessengerButton pageId={messengerPageId} /> : null}
          {whatsappNumber ? <WhatsAppButton number={whatsappNumber} /> : null}
        </div>
      ) : null}
    </>
  );
}
