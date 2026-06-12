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
const groupVisitorStorageKey = "prayer-circle-group-visitor";
const localGroupStorageKey = "prayer-circle-groups";
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
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const signUpButton = document.querySelector("#sign-up-button");
const logInButton = document.querySelector("#log-in-button");
const forgotPasswordButton = document.querySelector("#forgot-password-button");
const savePasswordButton = document.querySelector("#save-password-button");
const signOutButton = document.querySelector("#sign-out-button");
const authStatus = document.querySelector("#auth-status");
const encouragementList = document.querySelector("#encouragement-list");
const testimonyForm = document.querySelector("#testimony-form");
const testimonyName = document.querySelector("#testimony-name");
const testimonyMessage = document.querySelector("#testimony-message");
const testimonyNote = document.querySelector("#testimony-note");
const testimonyList = document.querySelector("#testimony-list");
const prayerGroupList = document.querySelector("#prayer-group-list");

const prayerGroups = [
  {
    key: "peace-world",
    title: "Peace in the world",
    description: "Pray for peace, mercy, and protection where communities are hurting.",
    focus: "Peace, protection, and comfort for those affected by conflict.",
  },
  {
    key: "war-conflict",
    title: "War and conflict",
    description: "Pray for people in war zones, displaced families, and wise peacemaking.",
    focus: "An end to violence and strength for those suffering.",
  },
  {
    key: "families",
    title: "Families",
    description: "Pray for homes, marriages, parents, children, and reconciliation.",
    focus: "Healing, patience, unity, and love in families.",
  },
  {
    key: "healing",
    title: "Healing",
    description: "Pray for people facing sickness, anxiety, grief, or recovery.",
    focus: "Strength, healing, and hope for body, mind, and spirit.",
  },
  {
    key: "youth-students",
    title: "Youth and students",
    description: "Pray for young people, schools, exams, friendships, and purpose.",
    focus: "Wisdom, protection, confidence, and good direction.",
  },
  {
    key: "leaders-nations",
    title: "Leaders and nations",
    description: "Pray for leaders to choose justice, mercy, and wisdom.",
    focus: "Righteous leadership and care for vulnerable people.",
  },
];

let requests = [];
let testimonies = [];
let groupStats = {};
let currentUser = null;
let usingDatabase = true;
let resettingPassword = false;
let prayedRequestIds = new Set(JSON.parse(localStorage.getItem(prayedStorageKey) || "[]"));
let signUpCooldownTimer = null;

const getGroupVisitorKey = () => {
  const existingKey = localStorage.getItem(groupVisitorStorageKey);
  if (existingKey) return existingKey;
  const newKey = crypto.randomUUID();
  localStorage.setItem(groupVisitorStorageKey, newKey);
  return newKey;
};

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

const loadLocalGroupStats = () => JSON.parse(localStorage.getItem(localGroupStorageKey) || "{}");

const saveLocalGroupStats = () => {
  localStorage.setItem(localGroupStorageKey, JSON.stringify(groupStats));
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

const startSignUpCooldown = (seconds = 120) => {
  clearInterval(signUpCooldownTimer);
  let remainingSeconds = seconds;

  const updateButton = () => {
    const minutes = Math.floor(remainingSeconds / 60);
    const secondsLeft = remainingSeconds % 60;
    signUpButton.disabled = true;
    signUpButton.textContent = `Wait ${minutes}:${String(secondsLeft).padStart(2, "0")}`;
  };

  updateButton();
  signUpCooldownTimer = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      clearInterval(signUpCooldownTimer);
      signUpButton.disabled = false;
      signUpButton.textContent = "Sign up";
      return;
    }

    updateButton();
  }, 1000);
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
  name: testimony.display_name || testimony.name || "Anonymous",
  message: testimony.message,
  createdAt: testimony.created_at || testimony.createdAt || Date.now(),
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
  signUpButton.classList.toggle("hidden", signedIn || resettingPassword);
  logInButton.classList.toggle("hidden", signedIn || resettingPassword);
  forgotPasswordButton.classList.toggle("hidden", signedIn || resettingPassword);
  savePasswordButton.classList.toggle("hidden", !resettingPassword);
  signOutButton.classList.toggle("hidden", !signedIn || resettingPassword);
  authEmail.disabled = signedIn;
  authPassword.disabled = signedIn && !resettingPassword;

  if (resettingPassword) {
    showAuthStatus("Enter a new password, then press Save new password.");
  } else if (signedIn) {
    const name = currentUser.user_metadata?.display_name || currentUser.email;
    showAuthStatus(`Signed in as ${name}.`);
  } else {
    showAuthStatus("You are browsing as a guest.");
  }
};

const renderEncouragements = async () => {
  if (!currentUser || !usingDatabase) {
    encouragementList.innerHTML =
      '<p class="muted-note">Sign in to see encouragement sent to your prayer requests.</p>';
    return;
  }

  const { data, error } = await supabase
    .from("encouragements")
    .select("message, sender_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    encouragementList.innerHTML =
      '<p class="muted-note">Encouragement messages will appear here after the database setup is complete.</p>';
    return;
  }

  if (!data.length) {
    encouragementList.innerHTML =
      '<p class="muted-note">No encouragement yet. When someone encourages you, it will appear here.</p>';
    return;
  }

  encouragementList.innerHTML = data
    .map(
      (item) => `
        <article class="encouragement-note">
          <p>${escapeHtml(item.message)}</p>
          <small>${escapeHtml(item.sender_name || "A PrayerPoint member")} · ${timeAgo(item.created_at)}</small>
        </article>
      `,
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
          <button class="mini-button" type="button" data-pray="${request.id}" ${
            alreadyPrayed ? "disabled" : ""
          }>${alreadyPrayed ? "Prayer counted" : "I prayed"}</button>
          <button class="ghost-button" type="button" data-encourage="${request.id}" ${
            canEncourage ? "" : "disabled"
          }>Encourage</button>
          <button class="ghost-button" type="button" data-share="${request.id}">Share</button>
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
      (testimony) => `
        <article class="testimony-card">
          <p>${escapeHtml(testimony.message)}</p>
          <small>${escapeHtml(testimony.name)} · ${timeAgo(testimony.createdAt)}</small>
        </article>
      `,
    )
    .join("");
};

const renderPrayerGroups = () => {
  prayerGroupList.innerHTML = prayerGroups
    .map((group) => {
      const stats = groupStats[group.key] || {};
      const joined = Boolean(stats.joined);
      const prayedToday = stats.prayedToday === new Date().toISOString().slice(0, 10);
      return `
        <article class="prayer-group-card">
          <span class="group-number">${escapeHtml(group.title.slice(0, 2).toUpperCase())}</span>
          <div>
            <h3>${escapeHtml(group.title)}</h3>
            <p>${escapeHtml(group.description)}</p>
            <small>${escapeHtml(group.focus)}</small>
          </div>
          <div class="group-stats">
            <strong>${stats.members || 0}</strong>
            <span>joined</span>
            <strong>${stats.prayers || 0}</strong>
            <span>prayers</span>
          </div>
          <div class="group-actions">
            <button class="mini-button" type="button" data-join-group="${group.key}" ${
              joined ? "disabled" : ""
            }>${joined ? "Joined" : "Join group"}</button>
            <button class="ghost-button" type="button" data-pray-group="${group.key}" ${
              prayedToday ? "disabled" : ""
            }>${prayedToday ? "Prayed today" : "I prayed today"}</button>
          </div>
        </article>
      `;
    })
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
    .select("id, display_name, message, created_at")
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

const loadPrayerGroups = async () => {
  const visitorKey = getGroupVisitorKey();

  if (!usingDatabase) {
    groupStats = loadLocalGroupStats();
    renderPrayerGroups();
    return;
  }

  const { data, error } = await supabase
    .from("prayer_group_activity")
    .select("group_key, visitor_key, joined, prayed_count, prayed_today_on");

  if (error) {
    groupStats = loadLocalGroupStats();
    renderPrayerGroups();
    return;
  }

  groupStats = {};
  prayerGroups.forEach((group) => {
    const rows = data.filter((item) => item.group_key === group.key);
    const ownRow = rows.find((item) => item.visitor_key === visitorKey);
    groupStats[group.key] = {
      members: rows.filter((item) => item.joined).length,
      prayers: rows.reduce((sum, item) => sum + (item.prayed_count || 0), 0),
      joined: Boolean(ownRow?.joined),
      prayedToday: ownRow?.prayed_today_on || "",
    };
  });

  renderPrayerGroups();
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

const joinPrayerGroup = async (groupKey) => {
  const visitorKey = getGroupVisitorKey();

  if (usingDatabase) {
    const { error } = await supabase.rpc("join_prayer_group", {
      group_name: groupKey,
      visitor: visitorKey,
    });

    if (!error) {
      await loadPrayerGroups();
      return;
    }
  }

  groupStats = loadLocalGroupStats();
  groupStats[groupKey] = {
    ...(groupStats[groupKey] || {}),
    members: (groupStats[groupKey]?.members || 0) + 1,
    joined: true,
  };
  saveLocalGroupStats();
  renderPrayerGroups();
};

const prayInPrayerGroup = async (groupKey) => {
  const visitorKey = getGroupVisitorKey();
  const today = new Date().toISOString().slice(0, 10);

  if (groupStats[groupKey]?.prayedToday === today) return;

  if (usingDatabase) {
    const { error } = await supabase.rpc("pray_in_group", {
      group_name: groupKey,
      visitor: visitorKey,
    });

    if (!error) {
      await loadPrayerGroups();
      return;
    }
  }

  groupStats = loadLocalGroupStats();
  groupStats[groupKey] = {
    ...(groupStats[groupKey] || {}),
    prayers: (groupStats[groupKey]?.prayers || 0) + 1,
    prayedToday: today,
  };
  saveLocalGroupStats();
  renderPrayerGroups();
};

const prayForRequest = async (id) => {
  if (prayedRequestIds.has(id)) {
    showFormNote("You have already counted a prayer for this request.");
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

const encourageRequest = async (id) => {
  const request = requests.find((item) => item.id === id);
  if (!request) return;
  if (!requireSignIn()) return;

  if (!request.userId || !request.openToConnect) {
    showFormNote("This request is not open for private encouragement.", true);
    return;
  }

  const message = window.prompt("Write a short encouragement message:");
  if (!message?.trim()) return;

  if (hasBlockedWords(message)) {
    showFormNote("Please remove vulgar or offensive words before sending encouragement.", true);
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
    showFormNote("Encouragement could not be sent yet. Check the Supabase setup.", true);
    return;
  }

  showFormNote("Your encouragement was sent privately.");
};

const submitTestimony = async (event) => {
  event.preventDefault();
  const name = testimonyName.value.trim() || "Anonymous";
  const message = testimonyMessage.value.trim();

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
    });

    if (error) {
      showTestimonyNote("Testimony could not be shared yet. Check the Supabase update.", true);
      return;
    }

    showTestimonyNote("Your testimony has been shared.");
    testimonyForm.reset();
    await loadTestimonies();
    return;
  }

  testimonies.unshift({
    id: crypto.randomUUID(),
    name,
    message,
    createdAt: Date.now(),
  });
  testimonyForm.reset();
  showTestimonyNote("Your testimony has been added on this device.");
  renderTestimonies();
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

  startSignUpCooldown();
  showAuthStatus("Sending confirmation email. Please wait before trying again.");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://prayerpointcommunity.github.io/",
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

  showAuthStatus("Check your email to confirm your account, then log in.");
};

const logIn = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }

  currentUser = data.user;
  renderAuth();
  await renderEncouragements();
};

const sendPasswordReset = async () => {
  const email = authEmail.value.trim();

  if (!email) {
    showAuthStatus("Enter your email, then press Forgot password.", true);
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://prayerpointcommunity.github.io/",
  });

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }

  showAuthStatus("Password reset email sent. Open the link, then set a new password here.");
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

form.addEventListener("submit", submitPrayerRequest);
testimonyForm.addEventListener("submit", submitTestimony);
filter.addEventListener("change", renderRequests);
signUpButton.addEventListener("click", signUp);
logInButton.addEventListener("click", logIn);
forgotPasswordButton.addEventListener("click", sendPasswordReset);
savePasswordButton.addEventListener("click", saveNewPassword);
signOutButton.addEventListener("click", signOut);

list.addEventListener("click", async (event) => {
  const prayButton = event.target.closest("[data-pray]");
  const encourageButton = event.target.closest("[data-encourage]");
  const shareButton = event.target.closest("[data-share]");
  const copyButton = event.target.closest("[data-copy-link]");
  const nativeShareButton = event.target.closest("[data-native-share]");

  if (prayButton) await prayForRequest(prayButton.dataset.pray);
  if (encourageButton) await encourageRequest(encourageButton.dataset.encourage);
  if (shareButton) await shareRequest(shareButton.dataset.share);
  if (copyButton) await copyShareLink(copyButton.dataset.copyLink);
  if (nativeShareButton) await nativeShareRequest(nativeShareButton.dataset.nativeShare);
});

prayerGroupList.addEventListener("click", async (event) => {
  const joinButton = event.target.closest("[data-join-group]");
  const prayButton = event.target.closest("[data-pray-group]");

  if (joinButton) await joinPrayerGroup(joinButton.dataset.joinGroup);
  if (prayButton) await prayInPrayerGroup(prayButton.dataset.prayGroup);
});

const initialize = async () => {
  renderDailyVerse();
  await handleAuthRedirect();
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;
  renderAuth();
  await loadRequests();
  await loadTestimonies();
  await loadPrayerGroups();
  await renderEncouragements();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    renderAuth();
    await renderEncouragements();
  });
};

initialize();
