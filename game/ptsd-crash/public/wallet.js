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
export function wallets() {
  discover();
  const list = [...found.values()].map((w) => ({ id: w.info.uuid, name: w.info.name, icon: w.info.icon, provider: w.provider }));
  if (!list.length && window.ethereum) list.push({ id: "injected", name: window.ethereum.isMetaMask ? "MetaMask" : "Browser wallet", icon: "", provider: window.ethereum });
  return list;
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
// Draws one button per installed wallet into `box`. onDone(wallet state) runs after a successful link, onError(message) on a failure.
export function renderWalletButtons(box, { api, onDone, onError }) {
  const draw = () => {
    const list = wallets();
    if (!list.length) {
      box.innerHTML = `<div class="wl-none">No wallet found in this browser.<br>Install <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask</a> (or another browser wallet), or on your phone open this page inside your wallet app's browser.</div>`;
      return;
    }
    box.innerHTML = list.map((w, i) => `<button type="button" class="wl-btn" data-i="${i}">${w.icon ? `<img src="${esc(w.icon)}" alt="" width="24" height="24">` : ""}<span>Connect ${esc(w.name)}</span></button>`).join("");
    box.querySelectorAll(".wl-btn").forEach((b) => (b.onclick = async () => {
      const w = list[Number(b.dataset.i)];
      box.querySelectorAll(".wl-btn").forEach((x) => (x.disabled = true));
      try {
        const j = await linkWallet(w.provider, api);
        onDone(j.wallet);
      } catch (err) {
        // 4001 = the player closed the wallet popup
        onError(err && err.code === 4001 ? "Cancelled in your wallet." : (err && err.message) || "Could not connect.");
        box.querySelectorAll(".wl-btn").forEach((x) => (x.disabled = false));
      }
    }));
  };
  draw();
  setTimeout(draw, 250); // wallets announce themselves a moment after the page loads
}
