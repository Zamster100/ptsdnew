// Browser side of "connect wallet": finds the installed wallets (EIP-6963, then window.ethereum),
// asks the chosen one to sign the server's one-time message, and sends the signature back.
// Nothing is sent on-chain and no funds are touched. Shared by the game and the profile page.
const found = new Map(); // uuid -> { info, provider }
let started = false;
function discover() {
  if (started) return;
  started = true;
  window.addEventListener("eip6963:announceProvider", (e) => { if (e.detail && e.detail.info) found.set(e.detail.info.uuid, e.detail); });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}
const isPhantom = (w) => /phantom/i.test(w.name || "") || /phantom/i.test(w.rdns || "");
export function wallets() {
  discover();
  const list = [...found.values()].map((w) => ({ id: w.info.uuid, name: w.info.name, rdns: w.info.rdns, icon: w.info.icon, provider: w.provider }));
  const eth = window.ethereum;
  if (!list.length && eth && !eth.isPhantom) list.push({ id: "injected", name: eth.isMetaMask ? "MetaMask" : "Browser wallet", icon: "", provider: eth });
  return list.filter((w) => !isPhantom(w));
}

const hex = (s) => "0x" + [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
// api(path, body) is the page's own helper: resolves with the JSON, throws an Error with the server's message.
export async function linkWallet(provider, api) {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const address = accounts && accounts[0];
  if (!address) throw new Error("No account was shared by the wallet.");
  const { nonce, message } = await api("wallet/nonce", {});
  const signature = await provider.request({ method: "personal_sign", params: [hex(message), address] });
  return api("wallet/connect", { nonce, address, signature });
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// One "Connect wallet" button. It opens a picker listing the wallets installed in this browser (Phantom is left out).
// onDone(wallet state) runs after a successful link, onError(message) on a failure.
export function renderWalletButtons(box, { api, onDone, onError }) {
  box.innerHTML = `<button type="button" class="wl-btn">Connect wallet</button>`;
  const main = box.querySelector(".wl-btn");
  const pick = () => {
    const list = wallets();
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px";
    const card = document.createElement("div");
    card.style.cssText = "width:min(360px,100%);background:var(--panel,#16181c);border:1px solid var(--bd,#2a2c31);border-radius:18px;padding:18px;color:var(--txt,#fff);font-family:Manrope,sans-serif";
    card.innerHTML = `<div style="display:flex;align-items:center;margin-bottom:12px"><b style="font-size:17px">Select a wallet</b><button type="button" data-x aria-label="Close" style="margin-left:auto;background:none;border:0;color:inherit;font-size:22px;cursor:pointer">×</button></div>
      <div class="wl-list" style="margin-top:0">${list.length ? list.map((w, i) => `<button type="button" class="wl-btn" data-i="${i}">${w.icon ? `<img src="${esc(w.icon)}" alt="" width="24" height="24">` : ""}<span>${esc(w.name)}</span></button>`).join("") : `<div class="wl-none">No wallet found in this browser.<br>Install a browser wallet such as <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask</a> or <a href="https://rabby.io" target="_blank" rel="noopener noreferrer">Rabby</a>, or on your phone open this page inside your wallet app's browser.</div>`}</div>`;
    ov.appendChild(card); document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.onclick = (e) => { if (e.target === ov) close(); };
    card.querySelector("[data-x]").onclick = close;
    card.querySelectorAll("[data-i]").forEach((b) => (b.onclick = async () => {
      const w = list[Number(b.dataset.i)];
      card.querySelectorAll("[data-i]").forEach((x) => (x.disabled = true));
      main.disabled = true;
      try {
        const j = await linkWallet(w.provider, api);
        close(); onDone(j.wallet);
      } catch (err) {
        close(); main.disabled = false;
        // 4001 = the player closed the wallet popup
        onError(err && err.code === 4001 ? "Cancelled in your wallet." : (err && err.message) || "Could not connect.");
      }
    }));
  };
  main.onclick = pick;
}
