export function injectNews() {
    fetch('/news.html')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load news.html");
        return res.text();
      })
      .then(html => {
        const target = document.getElementById('news-container');
        if (!target) {
          console.warn("[NewsModule] #news-container not found");
          return;
        }
        target.innerHTML = html;

        const script = document.createElement('script');
        script.type = 'module';
        script.src = '/news.js';
        document.body.appendChild(script);
      })
      .catch(err => console.error("[NewsModule] Injection failed:", err));
  }
