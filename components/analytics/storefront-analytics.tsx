import Script from "next/script";
import { getStorefrontAnalyticsTags } from "@/lib/analytics/config";

export async function StorefrontAnalytics() {
  const tags = await getStorefrontAnalyticsTags();

  return (
    <>
      {tags.gtmId ? (
        <>
          <Script id="th-gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${tags.gtmId}');`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${tags.gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}
      {tags.ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${tags.ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="th-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${tags.ga4Id}');`}
          </Script>
        </>
      ) : null}
      {tags.pixelId ? (
        <>
          <Script id="th-meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${tags.pixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${tags.pixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
