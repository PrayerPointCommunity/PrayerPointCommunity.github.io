import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://mufssprelgsroumvmrfk.supabase.co";
const supabaseKey = "sb_publishable_aTOd54VsmDOAJVBssxtrug_nV1_Vhas";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const authCard = document.querySelector("#admin-auth-card");
const authForm = document.querySelector("#admin-auth-form");
const adminEmail = document.querySelector("#admin-email");
const adminPassword = document.querySelector("#admin-password");
const adminStatus = document.querySelector("#admin-status");
const adminSignOut = document.querySelector("#admin-sign-out");
const dashboard = document.querySelector("#admin-dashboard");
const prayerList = document.querySelector("#admin-prayer-list");
const testimonyList = document.querySelector("#admin-testimony-list");
const logList = document.querySelector("#admin-log-list");
const prayerCount = document.querySelector("#admin-prayer-count");
const testimonyCount = document.querySelector("#admin-testimony-count");
const hiddenCount = document.querySelector("#admin-hidden-count");
const focusForm = document.querySelector("#focus-form");
const focusInput = document.querySelector("#focus-input");
const focusNote = document.querySelector("#focus-note");
const announcementForm = document.querySelector("#announcement-form");
const announcementInput = document.querySelector("#announcement-input");
const announcementNote = document.querySelector("#announcement-note");
const clearAnnouncement = document.querySelector("#clear-announcement");
const videoForm = document.querySelector("#video-form");
const videoInput = document.querySelector("#video-input");
const videoNote = document.querySelector("#video-note");

let currentUser = null;
let isAdmin = false;

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

const showStatus = (message, isError = false) => {
  adminStatus.textContent = message;
  adminStatus.classList.toggle("error", isError);
};

const showFocusNote = (message, isError = false) => {
  focusNote.textContent = message;
  focusNote.classList.toggle("error", isError);
};

const showAnnouncementNote = (message, isError = false) => {
  announcementNote.textContent = message;
  announcementNote.classList.toggle("error", isError);
};

const showVideoNote = (message, isError = false) => {
  videoNote.textContent = message;
  videoNote.classList.toggle("error", isError);
};

const getYouTubeEmbedUrl = (value) => {
  try {
    const url = new URL(value.trim());
    let videoId = "";

    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.slice(1).split("/")[0];
    } else if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/embed/")[1].split("/")[0];
      } else {
        videoId = url.searchParams.get("v") || "";
      }
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return "";
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return "";
  }
};

const timeAgo = (timestamp) => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
};

const renderAccess = () => {
  dashboard.classList.toggle("hidden", !isAdmin);
  adminSignOut.classList.toggle("hidden", !currentUser);
  adminEmail.disabled = Boolean(currentUser);
  adminPassword.disabled = Boolean(currentUser);
};

const checkAdminAccess = async () => {
  if (!currentUser?.email) {
    isAdmin = false;
    renderAccess();
    showStatus("Sign in with your approved admin email.");
    return;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("email")
    .eq("email", currentUser.email.toLowerCase())
    .maybeSingle();

  isAdmin = Boolean(data && !error);
  renderAccess();

  if (!isAdmin) {
    showStatus("This account is signed in, but it is not approved as an admin.", true);
    return;
  }

  showStatus(`Signed in as admin: ${currentUser.email}`);
  await loadAdminData();
};

const renderAdminItem = (item, type) => {
  const hidden = Boolean(item.is_hidden);
  const title = type === "prayer" ? item.category || "Prayer request" : "Testimony";
  const author = item.display_name || "Anonymous";
  const counts =
    type === "prayer"
      ? `${item.prayers || 0} prayers`
      : `${item.love_count || 0} love · ${item.celebrate_count || 0} celebrate · ${item.amen_count || 0} amen`;

  return `
    <article class="admin-item ${hidden ? "is-hidden" : ""}">
      <div class="admin-item-main">
        <div class="admin-item-meta">
          <span class="tag">${escapeHtml(title)}</span>
          <span>${escapeHtml(author)}</span>
          <span>${timeAgo(item.created_at)}</span>
          <span>${escapeHtml(counts)}</span>
          ${hidden ? "<span>Hidden</span>" : ""}
        </div>
        <p>${escapeHtml(item.message)}</p>
      </div>
      <div class="admin-item-actions">
        <button class="button outline" type="button" data-admin-${type}-hide="${item.id}" data-hidden="${hidden}">
          ${hidden ? "Restore" : "Hide"}
        </button>
        <button class="ghost-button danger-button" type="button" data-admin-${type}-delete="${item.id}">Delete</button>
      </div>
    </article>
  `;
};

const addModerationLog = async (action, targetType, targetId, details = "") => {
  if (!currentUser?.email || !isAdmin) return;

  await supabase.from("moderation_logs").insert({
    admin_email: currentUser.email.toLowerCase(),
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
};

const renderLogItem = (item) => `
  <article class="admin-log-item">
    <div>
      <strong>${escapeHtml(item.action)}</strong>
      <p>${escapeHtml(item.details || `${item.target_type || "setting"} updated`)}</p>
    </div>
    <span>${escapeHtml(item.admin_email || "Admin")} · ${timeAgo(item.created_at)}</span>
  </article>
`;

const loadAdminData = async () => {
  if (!isAdmin) return;

  const [prayers, testimonies, setting, logs] = await Promise.all([
    supabase
      .from("prayer_requests")
      .select("id, display_name, category, message, prayers, is_hidden, created_at")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("testimonies")
      .select("id, display_name, message, love_count, celebrate_count, amen_count, is_hidden, created_at")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("site_settings").select("key, value").in("key", ["daily_focus", "quiet_time_video", "announcement"]),
    supabase
      .from("moderation_logs")
      .select("admin_email, action, target_type, details, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (prayers.error || testimonies.error || logs.error) {
    showStatus("Admin setup is not complete yet. Please run the Supabase admin SQL.", true);
    return;
  }

  const prayerRows = prayers.data || [];
  const testimonyRows = testimonies.data || [];
  prayerCount.textContent = prayerRows.length;
  testimonyCount.textContent = testimonyRows.length;
  hiddenCount.textContent = [...prayerRows, ...testimonyRows].filter((item) => item.is_hidden).length;
  prayerList.innerHTML = prayerRows.length
    ? prayerRows.map((item) => renderAdminItem(item, "prayer")).join("")
    : '<div class="empty-state">No prayer requests yet.</div>';
  testimonyList.innerHTML = testimonyRows.length
    ? testimonyRows.map((item) => renderAdminItem(item, "testimony")).join("")
    : '<div class="empty-state">No testimonies yet.</div>';

  if (!setting.error) {
    const settings = Object.fromEntries((setting.data || []).map((item) => [item.key, item.value]));
    if (settings.daily_focus) focusInput.value = settings.daily_focus;
    if (settings.quiet_time_video) videoInput.value = settings.quiet_time_video;
    announcementInput.value = settings.announcement || "";
  }

  logList.innerHTML = logs.data?.length
    ? logs.data.map(renderLogItem).join("")
    : '<div class="empty-state">No admin actions recorded yet.</div>';
};

const setHidden = async (table, id, hidden) => {
  const { error } = await supabase.from(table).update({ is_hidden: hidden }).eq("id", id);

  if (error) {
    showStatus("Could not update this item. Check the Supabase admin SQL.", true);
    return;
  }

  const targetType = table === "prayer_requests" ? "Prayer request" : "Testimony";
  await addModerationLog(hidden ? "Hide" : "Restore", table, id, `${targetType} ${hidden ? "hidden" : "restored"}.`);
  await loadAdminData();
};

const deleteItem = async (table, id) => {
  const confirmed = window.confirm("Delete this permanently? Hide is safer if you may want to restore it later.");
  if (!confirmed) return;

  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    showStatus("Could not delete this item. Check the Supabase admin SQL.", true);
    return;
  }

  const targetType = table === "prayer_requests" ? "Prayer request" : "Testimony";
  await addModerationLog("Delete", table, id, `${targetType} deleted.`);
  await loadAdminData();
};

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showStatus("Signing in...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail.value.trim(),
    password: adminPassword.value,
  });

  if (error) {
    showStatus(error.message, true);
    return;
  }

  currentUser = data.user;
  adminPassword.value = "";
  await checkAdminAccess();
});

adminSignOut.addEventListener("click", async () => {
  await supabase.auth.signOut();
  currentUser = null;
  isAdmin = false;
  renderAccess();
  showStatus("Signed out.");
});

focusForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = focusInput.value.trim();

  if (!value) {
    showFocusNote("Add a short focus message first.", true);
    return;
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "daily_focus", value, updated_at: new Date().toISOString() });

  if (error) {
    showFocusNote("Could not save the focus yet. Check the Supabase admin SQL.", true);
    return;
  }

  await addModerationLog("Update focus", "site_settings", "daily_focus", `Daily focus changed to: ${value}`);
  showFocusNote("Daily focus saved.");
});

announcementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = announcementInput.value.trim();

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "announcement", value, updated_at: new Date().toISOString() });

  if (error) {
    showAnnouncementNote("Could not save the banner yet. Check the Supabase admin SQL.", true);
    return;
  }

  await addModerationLog("Update banner", "site_settings", "announcement", value ? `Banner changed to: ${value}` : "Banner cleared.");
  showAnnouncementNote(value ? "Announcement banner saved." : "Announcement banner cleared.");
  await loadAdminData();
});

clearAnnouncement.addEventListener("click", async () => {
  announcementInput.value = "";
  announcementForm.requestSubmit();
});

videoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const embedUrl = getYouTubeEmbedUrl(videoInput.value);

  if (!embedUrl) {
    showVideoNote("Paste a valid YouTube video link first.", true);
    return;
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "quiet_time_video", value: embedUrl, updated_at: new Date().toISOString() });

  if (error) {
    showVideoNote("Could not save the video yet. Check the Supabase admin SQL.", true);
    return;
  }

  videoInput.value = embedUrl;
  await addModerationLog("Update video", "site_settings", "quiet_time_video", `Quiet Time video changed to: ${embedUrl}`);
  showVideoNote("Quiet Time video saved.");
});

document.addEventListener("click", async (event) => {
  const refresh = event.target.closest("[data-refresh-admin]");
  if (refresh) await loadAdminData();

  const prayerHide = event.target.closest("[data-admin-prayer-hide]");
  if (prayerHide) {
    await setHidden("prayer_requests", prayerHide.dataset.adminPrayerHide, prayerHide.dataset.hidden !== "true");
  }

  const prayerDelete = event.target.closest("[data-admin-prayer-delete]");
  if (prayerDelete) await deleteItem("prayer_requests", prayerDelete.dataset.adminPrayerDelete);

  const testimonyHide = event.target.closest("[data-admin-testimony-hide]");
  if (testimonyHide) {
    await setHidden("testimonies", testimonyHide.dataset.adminTestimonyHide, testimonyHide.dataset.hidden !== "true");
  }

  const testimonyDelete = event.target.closest("[data-admin-testimony-delete]");
  if (testimonyDelete) await deleteItem("testimonies", testimonyDelete.dataset.adminTestimonyDelete);
});

const initialize = async () => {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;
  if (currentUser?.email) adminEmail.value = currentUser.email;
  await checkAdminAccess();
};

initialize();
