import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://mufssprelgsroumvmrfk.supabase.co";
const supabaseKey = "sb_publishable_aTOd54VsmDOAJVBssxtrug_nV1_Vhas";
const supabase = createClient(supabaseUrl, supabaseKey);

const seedRequests = [
  {
    id: crypto.randomUUID(),
    name: "Amara",
    category: "Healing",
    message: "Please pray for strength and healing for my mum as she recovers this week.",
    openToConnect: true,
    prayers: 12,
    createdAt: Date.now() - 1000 * 60 * 45,
  },
  {
    id: crypto.randomUUID(),
    name: "Anonymous",
    category: "Guidance",
    message: "I need wisdom for a major decision and peace while I wait for clarity.",
    openToConnect: true,
    prayers: 8,
    createdAt: Date.now() - 1000 * 60 * 140,
  },
  {
    id: crypto.randomUUID(),
    name: "Daniel",
    category: "Family",
    message: "Pray for reconciliation and patience in my family conversations.",
    openToConnect: false,
    prayers: 5,
    createdAt: Date.now() - 1000 * 60 * 250,
  },
];

const dailyVerses = [
  { text: "Pray without ceasing.", reference: "1 Thessalonians 5:17" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  { text: "The Lord is my strength and my shield.", reference: "Psalm 28:7" },
  { text: "Cast thy burden upon the Lord, and he shall sustain thee.", reference: "Psalm 55:22" },
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "The Lord bless thee, and keep thee.", reference: "Numbers 6:24" },
];

const blockedWords = [
  "arse",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "crap",
  "cunt",
  "damn",
  "dick",
  "fag",
  "faggot",
  "fuck",
  "motherfucker",
  "nigger",
  "piss",
  "prick",
  "pussy",
  "shit",
  "slut",
  "twat",
  "whore",
];

const storageKey = "prayer-circle-requests";
const prayedStorageKey = "prayer-circle-prayed-requests";
const testimonyReactionStorageKey = "prayer-circle-testimony-reactions";
const list = document.querySelector("#prayer-list");
const form = document.querySelector("#share");
const filter = document.querySelector("#filter");
const formNote = document.querySelector("#form-note");
const requestCount = document.querySelector("#request-count");
const prayerCount = document.querySelector("#prayer-count");
const dailyVerseText = document.querySelector("#daily-verse-text");
const dailyVerseReference = document.querySelector("#daily-verse-reference");
const nameInput = document.querySelector("#name");
const anonymousInput = document.querySelector("#post-anonymous");
const openToConnectInput = document.querySelector("#open-to-connect");
const durationInput = document.querySelector("#duration");
const accountToggle = document.querySelector("#account-toggle");
const accountToggleText = document.querySelector("#account-toggle-text");
const accountDot = document.querySelector("#account-dot");
const accountAlert = document.querySelector("#account-alert");
const accountPanel = document.querySelector("#account-panel");
const accountClose = document.querySelector("#account-close");
const profileStatus = document.querySelector("#profile-status");
const profileLoginState = document.querySelector("#profile-login-state");
const profileEmail = document.querySelector("#profile-email");
const authForm = document.querySelector("#auth-form");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const signUpButton = document.querySelector("#sign-up-button");
const logInButton = document.querySelector("#log-in-button");
const savePasswordButton = document.querySelector("#save-password-button");
const signOutButton = document.querySelector("#sign-out-button");
const authStatus = document.querySelector("#auth-status");
const encouragementList = document.querySelector("#encouragement-list");
const inboxTitle = document.querySelector("#inbox-title");
const encouragementDialog = document.querySelector("#encouragement-dialog");
const encouragementForm = document.querySelector("#encouragement-form");
const encouragementMessage = document.querySelector("#encouragement-message");
const encouragementRequestPreview = document.querySelector("#encouragement-request-preview");
const encouragementDialogNote = document.querySelector("#encouragement-dialog-note");
const encouragementCancel = document.querySelector("#encouragement-cancel");
const testimonyForm = document.querySelector("#testimony-form");
const testimonyName = document.querySelector("#testimony-name");
const testimonyAnonymous = document.querySelector("#testimony-anonymous");
const testimonyMessage = document.querySelector("#testimony-message");
const testimonyDuration = document.querySelector("#testimony-duration");
const testimonyNote = document.querySelector("#testimony-note");
const testimonyList = document.querySelector("#testimony-list");

let requests = [];
let testimonies = [];
let currentUser = null;
let usingDatabase = true;
let resettingPassword = false;
let prayedRequestIds = new Set(JSON.parse(localStorage.getItem(prayedStorageKey) || "[]"));
let reactedTestimonies = JSON.parse(localStorage.getItem(testimonyReactionStorageKey) || "{}");
let encouragementRequestId = null;

const loadLocalRequests = () => {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : seedRequests;
};

const saveLocalRequests = () => {
  localStorage.setItem(storageKey, JSON.stringify(requests));
};

const savePrayedRequestIds = () => {
  localStorage.setItem(prayedStorageKey, JSON.stringify([...prayedRequestIds]));
};

const saveReactedTestimonies = () => {
  localStorage.setItem(testimonyReactionStorageKey, JSON.stringify(reactedTestimonies));
};

const escapeHtml = (value) =>
  String(value || "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );

const hasBlockedWords = (value) => {
  const cleanValue = value.toLowerCase();
  return blockedWords.some((word) => {
    const pattern = new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i");
    return pattern.test(cleanValue);
  });
};

const showFormNote = (message, isError = false) => {
  formNote.textContent = message;
  formNote.classList.toggle("error", isError);
};

const showAuthStatus = (message, isError = false) => {
  authStatus.textContent = message;
  authStatus.classList.toggle("error", isError);
};

const showTestimonyNote = (message, isError = false) => {
  testimonyNote.textContent = message;
  testimonyNote.classList.toggle("error", isError);
};

const getAuthRedirectUrl = () => {
  if (window.location.origin.startsWith("https://")) {
    return `${window.location.origin}${window.location.pathname}`;
  }

  return "https://prayerpointcommunity.github.io/";
};

const timeAgo = (timestamp) => {
  const time = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
  const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
};

const normalizeRequest = (request) => ({
  id: request.id,
  userId: request.user_id || request.userId || null,
  name: request.display_name || request.name || "Anonymous",
  category: request.category || "",
  message: request.message,
  openToConnect: request.open_to_connect ?? request.openToConnect ?? true,
  prayers: request.prayers || 0,
  createdAt: request.created_at || request.createdAt || Date.now(),
  expiresAt: request.expires_at || request.expiresAt || null,
});

const normalizeTestimony = (testimony) => ({
  id: testimony.id,
  userId: testimony.user_id || testimony.userId || null,
  name: testimony.display_name || testimony.name || "Anonymous",
  message: testimony.message,
  loveCount: testimony.love_count || testimony.loveCount || 0,
  celebrateCount: testimony.celebrate_count || testimony.celebrateCount || 0,
  amenCount: testimony.amen_count || testimony.amenCount || 0,
  createdAt: testimony.created_at || testimony.createdAt || Date.now(),
  expiresAt: testimony.expires_at || testimony.expiresAt || null,
});

const getShareTargetId = () => new URLSearchParams(window.location.search).get("prayer");

const getShareUrl = (id) => {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "requests";
  url.searchParams.set("prayer", id);
  return url.toString();
};

const getShareText = (request) =>
  `Please pray for this request on PrayerPoint: "${request.message}"`;

const formatExpiry = (expiresAt) => {
  if (!expiresAt) return "Visible for 7 days";
  const end = new Date(expiresAt).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return "Expires soon";
  const days = Math.ceil(diff / 86400000);
  return days === 1 ? "Expires in 1 day" : `Expires in ${days} days`;
};

const updateStats = () => {
  requestCount.textContent = requests.length;
  prayerCount.textContent = requests.reduce((sum, request) => sum + request.prayers, 0);
};

const renderDailyVerse = () => {
  const dayNumber = Math.floor(Date.now() / 86400000);
  const verse = dailyVerses[dayNumber % dailyVerses.length];
  dailyVerseText.textContent = verse.text;
  dailyVerseReference.textContent = verse.reference;
};

const renderAuth = () => {
  const signedIn = Boolean(currentUser);
  const userEmail = currentUser?.email || "";
  signUpButton.classList.toggle("hidden", signedIn || resettingPassword);
  logInButton.classList.toggle("hidden", signedIn || resettingPassword);
  savePasswordButton.classList.toggle("hidden", !resettingPassword);
  signOutButton.classList.toggle("hidden", !signedIn || resettingPassword);
  authEmail.disabled = signedIn;
  authPassword.disabled = signedIn && !resettingPassword;
  signUpButton.disabled = false;
  signUpButton.textContent = "Sign up";
  accountToggleText.textContent = signedIn ? "Account" : "Guest";
  accountDot.classList.toggle("signed-in", signedIn);
  accountAlert.classList.add("hidden");
  accountAlert.textContent = "0";
  inboxTitle.textContent = "Your encouragement";
  profileLoginState.textContent = signedIn ? "Signed in" : "Guest";
  profileEmail.textContent = signedIn ? userEmail : "Not signed in";

  if (resettingPassword) {
    showAuthStatus("Enter a new password, then press Save new password.");
    profileStatus.textContent = "Password reset is open. Save a new password to continue.";
  } else if (signedIn) {
    showAuthStatus(`Signed in as ${userEmail}.`);
    profileStatus.textContent = "You are signed in. Encouragement sent to your prayer requests will appear here.";
  } else {
    showAuthStatus("You are browsing as a guest.");
    profileStatus.textContent = "Create an account or log in to post prayers, share testimonies, and receive encouragement.";
  }
};

const renderEncouragements = async () => {
  if (!currentUser || !usingDatabase) {
    accountAlert.classList.add("hidden");
    accountAlert.textContent = "0";
    inboxTitle.textContent = "Your encouragement";
    encouragementList.innerHTML =
      '<p class="muted-note">Sign in to see encouragement sent to your prayer requests.</p>';
    return;
  }

  const { data, error } = await supabase
    .from("encouragements")
    .select("id, message, sender_name, recipient_id, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    accountAlert.classList.add("hidden");
    accountAlert.textContent = "0";
    inboxTitle.textContent = "Your encouragement";
    encouragementList.innerHTML =
      '<p class="muted-note">Encouragement messages will appear here after the database setup is complete.</p>';
    return;
  }

  const receivedCount = data.filter((item) => item.recipient_id === currentUser.id).length;
  accountAlert.textContent = receivedCount > 9 ? "9+" : String(receivedCount);
  accountAlert.classList.toggle("hidden", receivedCount === 0);
  inboxTitle.textContent =
    receivedCount === 0
      ? "Your encouragement"
      : receivedCount === 1
        ? "Your encouragement (1)"
        : `Your encouragement (${receivedCount})`;

  if (!data.length) {
    encouragementList.innerHTML =
      '<p class="muted-note">No encouragement yet. When someone encourages you, it will appear here.</p>';
    return;
  }

  encouragementList.innerHTML = data
    .map(
      (item) => {
        const direction = item.recipient_id === currentUser.id ? "Received" : "Sent";
        return `
        <article class="encouragement-note">
          <div class="encouragement-note-header">
            <small>${direction} · ${escapeHtml(item.sender_name || "A PrayerPoint member")} · ${timeAgo(item.created_at)}</small>
            <button class="ghost-button danger-button" type="button" data-remove-encouragement="${item.id}">Remove</button>
          </div>
          <p>${escapeHtml(item.message)}</p>
        </article>
      `;
      },
    )
    .join("");
};

const renderRequests = () => {
  const activeFilter = filter.value;
  const shareTargetId = getShareTargetId();
  const visibleRequests =
    activeFilter === "All"
      ? requests
      : requests.filter((request) => (request.category || "Uncategorized") === activeFilter);

  updateStats();
  list.innerHTML = "";

  if (!visibleRequests.length) {
    list.innerHTML =
      '<div class="empty-state">No prayer points in this category yet. You can be the first to share one.</div>';
    return;
  }

  [...visibleRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((request) => {
      const card = document.createElement("article");
      card.className = "prayer-card";
      const category = request.category || "Uncategorized";
      const canEncourage = request.userId && request.openToConnect;
      const alreadyPrayed = prayedRequestIds.has(request.id);
      const canDelete = usingDatabase
        ? currentUser?.id && request.userId === currentUser.id
        : true;
      card.id = `prayer-${request.id}`;
      if (shareTargetId === request.id) card.classList.add("highlighted");
      card.innerHTML = `
        <div class="prayer-meta">
          <span class="tag">${escapeHtml(category)}</span>
          <span>${escapeHtml(request.name || "Anonymous")}</span>
          <span>${timeAgo(request.createdAt)}</span>
          <span>${formatExpiry(request.expiresAt)}</span>
          ${request.openToConnect ? "<span>Open to connect</span>" : ""}
        </div>
        <p>${escapeHtml(request.message)}</p>
        <div class="prayer-actions">
          <button class="mini-button" type="button" ${
            alreadyPrayed ? `data-unpray="${request.id}"` : `data-pray="${request.id}"`
          }>${alreadyPrayed ? "Undo prayer" : "I prayed"}</button>
          <button class="ghost-button" type="button" data-encourage="${request.id}" ${
            canEncourage ? "" : "disabled"
          }>Encourage</button>
          <button class="ghost-button" type="button" data-share="${request.id}">Share</button>
          ${
            canDelete
              ? `<button class="ghost-button danger-button" type="button" data-delete-request="${request.id}">Remove</button>`
              : ""
          }
          <span class="prayed-count">${request.prayers} prayers</span>
        </div>
        <div class="share-panel hidden" id="share-panel-${request.id}" aria-label="Share this prayer request">
          <button class="ghost-button" type="button" data-copy-link="${request.id}">Copy link</button>
          <a class="ghost-link" href="${escapeHtml(
            `https://wa.me/?text=${encodeURIComponent(`${getShareText(request)} ${getShareUrl(request.id)}`)}`,
          )}" target="_blank" rel="noreferrer">WhatsApp</a>
          <a class="ghost-link" href="${escapeHtml(
            `mailto:?subject=${encodeURIComponent("Prayer request from PrayerPoint")}&body=${encodeURIComponent(
              `${getShareText(request)}\n\n${getShareUrl(request.id)}`,
            )}`,
          )}">Email</a>
          ${
            navigator.share
              ? `<button class="ghost-button" type="button" data-native-share="${request.id}">Device share</button>`
              : ""
          }
          <span class="copied-note hidden" id="copied-${request.id}">Copied</span>
        </div>
      `;
      list.append(card);
    });

  if (shareTargetId) {
    document.querySelector(`#prayer-${CSS.escape(shareTargetId)}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
};

const renderTestimonies = () => {
  if (!testimonies.length) {
    testimonyList.innerHTML =
      '<div class="empty-state">No testimonies yet. Be the first to share an answered prayer.</div>';
    return;
  }

  testimonyList.innerHTML = testimonies
    .map(
      (testimony) => {
        const selectedReaction = reactedTestimonies[testimony.id];
        const canDelete =
          !usingDatabase || (currentUser?.id && testimony.userId === currentUser.id);
        return `
        <article class="testimony-card">
          <p>${escapeHtml(testimony.message)}</p>
          <small>${escapeHtml(testimony.name)} · ${timeAgo(testimony.createdAt)} · ${formatExpiry(testimony.expiresAt)}</small>
          <div class="testimony-reactions" aria-label="React to this testimony">
            <button class="reaction-button ${
              selectedReaction === "love" ? "active" : ""
            }" type="button" data-testimony-reaction="love" data-testimony-id="${testimony.id}">
              <span aria-hidden="true">❤️</span>
              <span>Love</span>
              <strong>${testimony.loveCount}</strong>
            </button>
            <button class="reaction-button ${
              selectedReaction === "celebrate" ? "active" : ""
            }" type="button" data-testimony-reaction="celebrate" data-testimony-id="${testimony.id}">
              <span aria-hidden="true">🎉</span>
              <span>Celebrate</span>
              <strong>${testimony.celebrateCount}</strong>
            </button>
            <button class="reaction-button ${
              selectedReaction === "amen" ? "active" : ""
            }" type="button" data-testimony-reaction="amen" data-testimony-id="${testimony.id}">
              <span aria-hidden="true">🙏</span>
              <span>Amen</span>
              <strong>${testimony.amenCount}</strong>
            </button>
            ${
              canDelete
                ? `<button class="ghost-button danger-button" type="button" data-delete-testimony="${testimony.id}">Remove</button>`
                : ""
            }
          </div>
        </article>
      `;
      },
    )
    .join("");
};

const loadRequests = async () => {
  if (!usingDatabase) {
    requests = loadLocalRequests();
    renderRequests();
    return;
  }

  const { data, error } = await supabase
    .from("prayer_requests")
    .select("id, user_id, display_name, category, message, open_to_connect, prayers, created_at, expires_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    usingDatabase = false;
    requests = loadLocalRequests();
    showFormNote("Database setup is not complete yet. Showing guest demo requests.", true);
  } else {
    requests = data.map(normalizeRequest);
  }

  renderRequests();
};

const loadTestimonies = async () => {
  if (!usingDatabase) {
    testimonies = [];
    renderTestimonies();
    return;
  }

  const { data, error } = await supabase
    .from("testimonies")
    .select("id, user_id, display_name, message, love_count, celebrate_count, amen_count, created_at, expires_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    testimonies = [];
    showTestimonyNote("Testimonies will appear after the database update is complete.", true);
  } else {
    testimonies = data.map(normalizeTestimony);
  }

  renderTestimonies();
};

const requireSignIn = () => {
  if (currentUser) return true;
  showAuthStatus("Please sign up or log in first.", true);
  document.querySelector("#account-title").scrollIntoView({ behavior: "smooth" });
  return false;
};

const submitPrayerRequest = async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const message = formData.get("message").trim();
  const isAnonymous = anonymousInput.checked;
  const name = isAnonymous ? "Anonymous" : formData.get("name").trim() || "Anonymous";
  const durationDays = Number(formData.get("duration") || 7);
  const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();

  if (!message) return;

  if (hasBlockedWords(`${name} ${message}`)) {
    showFormNote("Please remove vulgar or offensive words before posting this prayer request.", true);
    return;
  }

  if (usingDatabase && !requireSignIn()) return;

  const newRequest = {
    id: crypto.randomUUID(),
    userId: currentUser?.id || null,
    name,
    category: formData.get("category") || "",
    message,
    openToConnect: openToConnectInput.checked,
    prayers: 0,
    createdAt: Date.now(),
    expiresAt,
  };

  if (usingDatabase) {
    const { error } = await supabase.from("prayer_requests").insert({
      user_id: currentUser.id,
      display_name: name,
      category: newRequest.category || null,
      message,
      open_to_connect: newRequest.openToConnect,
      prayers: 0,
      expires_at: expiresAt,
    });

    if (error) {
      showFormNote(error.message, true);
      return;
    }

    showFormNote("Your prayer point has been shared.");
    await loadRequests();
  } else {
    requests.unshift(newRequest);
    saveLocalRequests();
    showFormNote("Your prayer point has been added on this device.");
    renderRequests();
  }

  form.reset();
  nameInput.disabled = false;
  nameInput.placeholder = "First name or anonymous";
  openToConnectInput.checked = true;
  durationInput.value = "7";
};

const shareRequest = async (id) => {
  document.querySelectorAll(".share-panel").forEach((panel) => {
    if (panel.id !== `share-panel-${id}`) panel.classList.add("hidden");
  });
  document.querySelector(`#share-panel-${CSS.escape(id)}`)?.classList.toggle("hidden");
};

const copyShareLink = async (id) => {
  const url = getShareUrl(id);

  try {
    await navigator.clipboard.writeText(url);
    document.querySelector(`#copied-${CSS.escape(id)}`)?.classList.remove("hidden");
    showFormNote("Prayer request link copied. Share it with someone who can pray.");
  } catch (_error) {
    window.prompt("Copy this prayer request link:", url);
  }
};

const nativeShareRequest = async (id) => {
  const request = requests.find((item) => item.id === id);
  if (!request || !navigator.share) return;

  try {
    await navigator.share({
      title: "PrayerPoint prayer request",
      text: getShareText(request),
      url: getShareUrl(id),
    });
  } catch (_error) {
    showFormNote("Sharing was cancelled.");
  }
};

const prayForRequest = async (id) => {
  if (prayedRequestIds.has(id)) {
    await undoPrayerForRequest(id);
    return;
  }

  const request = requests.find((item) => item.id === id);
  if (!request) return;

  if (usingDatabase) {
    const { error } = await supabase.rpc("increment_prayer_count", { request_id: id });
    if (error) {
      showFormNote("Could not update the prayer count yet.", true);
      return;
    }
    prayedRequestIds.add(id);
    savePrayedRequestIds();
    await loadRequests();
    return;
  }

  request.prayers += 1;
  prayedRequestIds.add(id);
  savePrayedRequestIds();
  saveLocalRequests();
  renderRequests();
};

const undoPrayerForRequest = async (id) => {
  if (!prayedRequestIds.has(id)) return;

  const request = requests.find((item) => item.id === id);
  if (!request) return;

  if (usingDatabase) {
    const { error } = await supabase.rpc("decrement_prayer_count", { request_id: id });
    if (error) {
      showFormNote("Undo prayer needs the latest Supabase update before it can work live.", true);
      return;
    }
    prayedRequestIds.delete(id);
    savePrayedRequestIds();
    await loadRequests();
    showFormNote("Prayer count updated.");
    return;
  }

  request.prayers = Math.max(0, request.prayers - 1);
  prayedRequestIds.delete(id);
  savePrayedRequestIds();
  saveLocalRequests();
  renderRequests();
  showFormNote("Prayer count updated.");
};

const deletePrayerRequest = async (id) => {
  const request = requests.find((item) => item.id === id);
  if (!request) return;

  const shouldDelete = window.confirm("Remove this prayer request from the wall?");
  if (!shouldDelete) return;

  if (usingDatabase) {
    if (!currentUser || request.userId !== currentUser.id) {
      showFormNote("You can only remove prayer requests you posted.", true);
      return;
    }

    const { error } = await supabase
      .from("prayer_requests")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id);

    if (error) {
      showFormNote("Could not remove this prayer request yet.", true);
      return;
    }

    prayedRequestIds.delete(id);
    savePrayedRequestIds();
    await loadRequests();
    showFormNote("Prayer request removed.");
    return;
  }

  requests = requests.filter((item) => item.id !== id);
  prayedRequestIds.delete(id);
  savePrayedRequestIds();
  saveLocalRequests();
  renderRequests();
  showFormNote("Prayer request removed.");
};

const showEncouragementDialogNote = (message, isError = false) => {
  encouragementDialogNote.textContent = message;
  encouragementDialogNote.classList.toggle("error", isError);
};

const closeEncouragementDialog = () => {
  encouragementRequestId = null;
  encouragementForm.reset();
  showEncouragementDialogNote("");
  encouragementDialog.classList.add("hidden");
};

const openEncouragementDialog = (id) => {
  const request = requests.find((item) => item.id === id);
  if (!request) return;
  if (!requireSignIn()) return;

  if (!request.userId || !request.openToConnect) {
    showFormNote("This request is not open for private encouragement.", true);
    return;
  }

  encouragementRequestId = id;
  encouragementRequestPreview.textContent = request.message;
  showEncouragementDialogNote("");
  encouragementDialog.classList.remove("hidden");
  encouragementMessage.focus();
};

const sendEncouragement = async (event) => {
  event.preventDefault();
  const request = requests.find((item) => item.id === encouragementRequestId);
  if (!request) {
    closeEncouragementDialog();
    return;
  }

  const message = encouragementMessage.value.trim();
  if (!message) return;

  if (hasBlockedWords(message)) {
    showEncouragementDialogNote("Please remove vulgar or offensive words before sending encouragement.", true);
    return;
  }

  const senderName = currentUser.user_metadata?.display_name || "A PrayerPoint member";
  const { error } = await supabase.from("encouragements").insert({
    request_id: request.id,
    recipient_id: request.userId,
    sender_id: currentUser.id,
    sender_name: senderName,
    message: message.trim(),
  });

  if (error) {
    showEncouragementDialogNote("Encouragement could not be sent yet. Check the Supabase setup.", true);
    return;
  }

  closeEncouragementDialog();
  showFormNote("Your encouragement was sent privately.");
  await renderEncouragements();
};

const submitTestimony = async (event) => {
  event.preventDefault();
  const name = testimonyAnonymous.checked ? "Anonymous" : testimonyName.value.trim() || "Anonymous";
  const message = testimonyMessage.value.trim();
  const durationDays = Number(testimonyDuration.value || 7);
  const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();

  if (!message) return;

  if (hasBlockedWords(`${name} ${message}`)) {
    showTestimonyNote("Please remove vulgar or offensive words before sharing this testimony.", true);
    return;
  }

  if (usingDatabase && !requireSignIn()) return;

  if (usingDatabase) {
    const { error } = await supabase.from("testimonies").insert({
      user_id: currentUser.id,
      display_name: name,
      message,
      expires_at: expiresAt,
    });

    if (error) {
      showTestimonyNote("Testimony could not be shared yet. Check the Supabase update.", true);
      return;
    }

    showTestimonyNote("Your testimony has been shared.");
    testimonyForm.reset();
    testimonyName.disabled = false;
    testimonyName.placeholder = "First name or anonymous";
    testimonyDuration.value = "7";
    await loadTestimonies();
    return;
  }

  testimonies.unshift({
    id: crypto.randomUUID(),
    name,
    message,
    loveCount: 0,
    celebrateCount: 0,
    amenCount: 0,
    createdAt: Date.now(),
    expiresAt,
  });
  testimonyForm.reset();
  testimonyName.disabled = false;
  testimonyName.placeholder = "First name or anonymous";
  testimonyDuration.value = "7";
  showTestimonyNote("Your testimony has been added on this device.");
  renderTestimonies();
};

const reactToTestimony = async (id, reaction) => {
  if (reactedTestimonies[id]) {
    showTestimonyNote("You already reacted to this testimony.");
    return;
  }

  const testimony = testimonies.find((item) => item.id === id);
  if (!testimony) return;

  if (usingDatabase) {
    const { error } = await supabase.rpc("increment_testimony_reaction", {
      testimony_id: id,
      reaction_name: reaction,
    });

    if (error) {
      showTestimonyNote("Testimony reactions need the latest Supabase update before they can work live.", true);
      return;
    }

    reactedTestimonies[id] = reaction;
    saveReactedTestimonies();
    await loadTestimonies();
    return;
  }

  const countKey = `${reaction}Count`;
  testimony[countKey] = (testimony[countKey] || 0) + 1;
  reactedTestimonies[id] = reaction;
  saveReactedTestimonies();
  renderTestimonies();
};

const deleteTestimony = async (id) => {
  const testimony = testimonies.find((item) => item.id === id);
  if (!testimony) return;

  const shouldDelete = window.confirm("Remove this testimony from the wall?");
  if (!shouldDelete) return;

  if (usingDatabase) {
    if (!currentUser || testimony.userId !== currentUser.id) {
      showTestimonyNote("You can only remove testimonies you posted.", true);
      return;
    }

    const { error } = await supabase
      .from("testimonies")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id);

    if (error) {
      showTestimonyNote("Could not remove this testimony yet.", true);
      return;
    }

    delete reactedTestimonies[id];
    saveReactedTestimonies();
    await loadTestimonies();
    showTestimonyNote("Testimony removed.");
    return;
  }

  testimonies = testimonies.filter((item) => item.id !== id);
  delete reactedTestimonies[id];
  saveReactedTestimonies();
  renderTestimonies();
  showTestimonyNote("Testimony removed.");
};

const signUp = async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email) {
    showAuthStatus("Enter your email before signing up.", true);
    return;
  }

  if (password.length < 6) {
    showAuthStatus("Password must be at least 6 characters.", true);
    return;
  }

  showAuthStatus("Sending confirmation email. Please wait before trying again.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    const rateLimited = error.message.toLowerCase().includes("rate limit");
    showAuthStatus(
      rateLimited
        ? "Please wait about 2 minutes before requesting another signup email."
        : error.message,
      true,
    );
    return;
  }

  if (data.session) {
    await supabase.auth.signOut();
    currentUser = null;
    renderAuth();
    showAuthStatus(
      "Signup is still letting people in immediately. Turn on email confirmations in Supabase, then try again.",
      true,
    );
    return;
  }

  showAuthStatus("Check your inbox and spam folder for the confirmation email.");
};

const logIn = async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email) {
    showAuthStatus("Enter your email before logging in.", true);
    return;
  }

  if (!password) {
    showAuthStatus("Enter your password before logging in.", true);
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }

  currentUser = data.user;
  renderAuth();
  await renderEncouragements();
};

const saveNewPassword = async () => {
  const password = authPassword.value;

  if (password.length < 6) {
    showAuthStatus("Password must be at least 6 characters.", true);
    return;
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }

  resettingPassword = false;
  authPassword.value = "";
  showAuthStatus("Your password has been updated.");
  renderAuth();
};

const signOut = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  renderAuth();
  await renderEncouragements();
};

const handleAuthAction = async (event) => {
  const actionButton = event.target.closest("[data-auth-action]");
  if (!actionButton) return;

  event.preventDefault();
  const action = actionButton.dataset.authAction;

  if (action === "sign-up") await signUp();
  if (action === "log-in") await logIn();
  if (action === "save-password") await saveNewPassword();
  if (action === "sign-out") await signOut();
};

const openAccountPanel = () => {
  accountPanel.classList.remove("hidden");
  accountToggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("profile-open");
};

const closeAccountPanel = () => {
  accountPanel.classList.add("hidden");
  accountToggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("profile-open");
};

const toggleAccountPanel = () => {
  if (accountPanel.classList.contains("hidden")) {
    openAccountPanel();
  } else {
    closeAccountPanel();
  }
};

const removeEncouragement = async (id) => {
  if (!currentUser || !usingDatabase) return;

  const { error } = await supabase.from("encouragements").delete().eq("id", id);

  if (error) {
    encouragementList.insertAdjacentHTML(
      "afterbegin",
      '<p class="form-note error">Encouragement could not be removed yet. Please run the Supabase update.</p>',
    );
    return;
  }

  await renderEncouragements();
};

const handleAuthRedirect = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const type = params.get("type");

  if (!code) return;

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    showAuthStatus("This link was opened. Please log in or request a fresh password reset.", true);
  } else if (type === "recovery") {
    resettingPassword = true;
    showAuthStatus("Enter a new password, then press Save new password.");
  } else {
    showAuthStatus("Your account is confirmed and you are signed in.");
  }

  window.history.replaceState({}, document.title, window.location.pathname);
};

anonymousInput.addEventListener("change", () => {
  nameInput.disabled = anonymousInput.checked;
  nameInput.value = anonymousInput.checked ? "" : nameInput.value;
  nameInput.placeholder = anonymousInput.checked ? "Posting anonymously" : "First name or anonymous";
});

testimonyAnonymous.addEventListener("change", () => {
  testimonyName.disabled = testimonyAnonymous.checked;
  testimonyName.value = testimonyAnonymous.checked ? "" : testimonyName.value;
  testimonyName.placeholder = testimonyAnonymous.checked ? "Posting anonymously" : "First name or anonymous";
});

form.addEventListener("submit", submitPrayerRequest);
testimonyForm.addEventListener("submit", submitTestimony);
filter.addEventListener("change", renderRequests);
authForm.addEventListener("click", handleAuthAction);
authForm.addEventListener("submit", (event) => event.preventDefault());
accountToggle.addEventListener("click", toggleAccountPanel);
accountClose.addEventListener("click", closeAccountPanel);
encouragementForm.addEventListener("submit", sendEncouragement);
encouragementCancel.addEventListener("click", closeEncouragementDialog);

encouragementList.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-remove-encouragement]");
  if (!removeButton) return;

  await removeEncouragement(removeButton.dataset.removeEncouragement);
});

encouragementDialog.addEventListener("click", (event) => {
  if (event.target === encouragementDialog) closeEncouragementDialog();
});

document.addEventListener("click", (event) => {
  if (
    accountPanel.classList.contains("hidden") ||
    accountPanel.contains(event.target) ||
    accountToggle.contains(event.target)
  ) {
    return;
  }

  closeAccountPanel();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAccountPanel();
    if (!encouragementDialog.classList.contains("hidden")) closeEncouragementDialog();
  }
});

testimonyList.addEventListener("click", async (event) => {
  const reactionButton = event.target.closest("[data-testimony-reaction]");
  const deleteButton = event.target.closest("[data-delete-testimony]");

  if (reactionButton) {
    await reactToTestimony(
      reactionButton.dataset.testimonyId,
      reactionButton.dataset.testimonyReaction,
    );
  }

  if (deleteButton) await deleteTestimony(deleteButton.dataset.deleteTestimony);
});

list.addEventListener("click", async (event) => {
  const prayButton = event.target.closest("[data-pray]");
  const unprayButton = event.target.closest("[data-unpray]");
  const encourageButton = event.target.closest("[data-encourage]");
  const shareButton = event.target.closest("[data-share]");
  const deleteButton = event.target.closest("[data-delete-request]");
  const copyButton = event.target.closest("[data-copy-link]");
  const nativeShareButton = event.target.closest("[data-native-share]");

  if (prayButton) await prayForRequest(prayButton.dataset.pray);
  if (unprayButton) await undoPrayerForRequest(unprayButton.dataset.unpray);
  if (encourageButton) openEncouragementDialog(encourageButton.dataset.encourage);
  if (shareButton) await shareRequest(shareButton.dataset.share);
  if (deleteButton) await deletePrayerRequest(deleteButton.dataset.deleteRequest);
  if (copyButton) await copyShareLink(copyButton.dataset.copyLink);
  if (nativeShareButton) await nativeShareRequest(nativeShareButton.dataset.nativeShare);
});

const initialize = async () => {
  renderDailyVerse();
  await handleAuthRedirect();
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;
  renderAuth();
  await loadRequests();
  await loadTestimonies();
  await renderEncouragements();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    renderAuth();
    await renderEncouragements();
  });
};

initialize();
