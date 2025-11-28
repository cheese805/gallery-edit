// script/galleryeditscript.js

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     0. 설정
     ========================= */
  const USE_MOCK = false; // 🔥 이제 진짜 서버 사용!

const API_BASE = "https://hongsungwon-gallery-server.onrender.com/api/gallery";
const UPLOAD_ENDPOINT = "https://hongsungwon-gallery-server.onrender.com/api/upload";
const SERVER_ORIGIN = "https://hongsungwon-gallery-server.onrender.com";

  let entries = [];
  let selectedId = null;

  /* =========================
     DOM 참조
     ========================= */
  const $list = document.getElementById("entry-list");
  const $search = document.getElementById("search-input");

  const $form = document.getElementById("entry-form");
  const $id = document.getElementById("field-id");
  const $date = document.getElementById("field-date");
  const $sourceType = document.getElementById("field-source-type");
  const $sourceLabel = document.getElementById("field-source-label");
  const $tags = document.getElementById("field-tags");
  const $mediaList = document.getElementById("media-list");

  const $btnNew = document.getElementById("btn-new");
  const $btnReload = document.getElementById("btn-reload");
  const $btnLogout = document.getElementById("btn-logout");
  const $btnDelete = document.getElementById("btn-delete");
  const $btnReset = document.getElementById("btn-reset");
  const $btnAddImage = document.getElementById("btn-add-image");
  const $btnAddVideo = document.getElementById("btn-add-video");
  const $status = document.getElementById("status-text");

  /* =========================
     공통 상태 출력
     ========================= */
  function setStatus(msg, isError = false) {
    if (!$status) return;
    $status.textContent = msg || "";
    $status.style.color = isError ? "#c62828" : "#777";
  }

  /* =========================
     2. 데이터 로드
     ========================= */
  async function loadEntries() {
    try {
      setStatus("데이터 불러오는 중…");

      if (USE_MOCK) {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(res.status);
        entries = await res.json();
      } else {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(res.status);
        entries = await res.json();
      }

      sortEntries();
      renderList();
      clearForm();
      setStatus("불러오기 완료.");
    } catch (err) {
      console.error(err);
      setStatus("데이터를 불러오지 못했어요. (콘솔 확인)", true);
    }
  }

  function sortEntries() {
    entries.sort((a, b) => {
      const ad = new Date(a.date || 0).getTime();
      const bd = new Date(b.date || 0).getTime();

      if (ad !== bd) return bd - ad;
      return (a.id || "").localeCompare(b.id || "");
    });
  }

  /* =========================
     3. 리스트 렌더
     ========================= */
  function normalizePath(path) {
    if (!path) return "";
    return path;
  }

  function getFirstMediaForList(entry) {
    if (entry.images && entry.images.length > 0) {
      return { type: "image", src: entry.images[0] };
    }

    if (entry.media && entry.media.length > 0) {
      const img = entry.media.find((m) => m.type === "image");
      if (img) return { type: "image", src: img.src || img.url };

      const vid = entry.media.find((m) => m.type === "video");
      if (vid) return { type: "video", src: vid.src || vid.url };
    }

    return null;
  }

  function normalizeThumbSrc(src) {
    if (!src) return "";
    if (/^https?:\/\//.test(src)) return src;
    if (src.startsWith("/")) return SERVER_ORIGIN + src;
    return SERVER_ORIGIN + "/" + src;
  }

  function renderList() {
    if (!$list) return;
    const q = ($search?.value || "").toLowerCase().trim();
    $list.innerHTML = "";

    const filtered = entries.filter((e) => {
      if (!q) return true;
      const hay = [
        e.id,
        e.date,
        e.source?.label,
        ...(e.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });

    if (!filtered.length) {
      const li = document.createElement("li");
      li.textContent = "검색 결과가 없어요.";
      li.style.fontSize = "0.8rem";
      li.style.color = "#999";
      $list.appendChild(li);
      return;
    }

    filtered.forEach((e) => {
      const li = document.createElement("li");
      li.className = "entry-item";
      if (e.id === selectedId) li.classList.add("active");

      const meta = [];
      if (e.date) meta.push(e.date);
      if (e.source?.label) meta.push(e.source.label);

      const media = getFirstMediaForList(e);
      let thumbHtml = `<div class="entry-thumb thumb-empty"></div>`;

      if (media && media.type === "image" && media.src) {
        const src = normalizeThumbSrc(media.src);
        thumbHtml = `
          <div class="entry-thumb">
            <img src="${src}" alt="">
          </div>
        `;
      }

      li.innerHTML = `
        ${thumbHtml}
        <div class="entry-text">
          <div class="entry-item-id">${e.id || "(no id)"}</div>
          <div class="entry-item-meta">${meta.join(" · ")}</div>
        </div>
      `;

      li.addEventListener("click", () => {
        selectedId = e.id;
        fillForm(e);
        renderList();
      });

      $list.appendChild(li);
    });
  }

  /* =========================
     4. MEDIA 행 유틸
     ========================= */
  function createMediaRow({ type = "image", src = "" } = {}) {
    const row = document.createElement("div");
    row.className = "media-row";

    row.innerHTML = `
      <select class="media-type">
        <option value="image" ${type === "image" ? "selected" : ""}>image</option>
        <option value="video" ${type === "video" ? "selected" : ""}>video</option>
      </select>

      <input
        type="text"
        class="media-src"
        placeholder="/galleryimg/250913post1.jpg"
        value="${src || ""}"
      />

      <input
        type="file"
        class="media-file"
        accept="image/*,video/*"
      />

      <div class="media-row-actions">
        <button type="button" class="btn tiny media-upload">업로드</button>
        <button type="button" class="btn tiny danger media-remove">삭제</button>
      </div>
    `;

    const fileInput = row.querySelector(".media-file");
    const uploadBtn = row.querySelector(".media-upload");
    const removeBtn = row.querySelector(".media-remove");
    const srcInput = row.querySelector(".media-src");

    removeBtn.addEventListener("click", () => {
      row.remove();
    });

    uploadBtn.addEventListener("click", async () => {
      const file = fileInput.files[0];
      if (!file) {
        alert("파일을 선택해주세요.");
        return;
      }
      if (!UPLOAD_ENDPOINT) {
        alert("UPLOAD_ENDPOINT가 설정되지 않았습니다.");
        return;
      }

      try {
        setStatus("파일 업로드 중…");
        const url = await uploadFileToServer(file);
        srcInput.value = url;
        setStatus("업로드 완료!");
      } catch (err) {
        console.error(err);
        setStatus("업로드 실패.", true);
      }
    });

    return row;
  }

  async function uploadFileToServer(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("업로드 실패: " + res.status);
    }

    const json = await res.json();
    if (!json.url) {
      throw new Error("응답에 url이 없습니다.");
    }
    return json.url;
  }

  /* =========================
     5. 폼 채우기 / 비우기
     ========================= */
  function fillForm(entry) {
    $id.value = entry.id || "";
    $date.value = entry.date || "";
    $sourceType.value = entry.source?.type || "";
    $sourceLabel.value = entry.source?.label || "";
    $tags.value = (entry.tags || []).join(", ");

    if ($mediaList) {
      $mediaList.innerHTML = "";

      if (entry.media && entry.media.length > 0) {
        entry.media.forEach((m) => {
          const type = m.type || "image";
          const src = m.src || m.url || "";
          $mediaList.appendChild(createMediaRow({ type, src }));
        });
      } else if (entry.images && entry.images.length > 0) {
        entry.images.forEach((src) => {
          $mediaList.appendChild(createMediaRow({ type: "image", src }));
        });
      }
    }
  }

  function clearForm() {
    selectedId = null;
    $id.value = "";
    $date.value = "";
    $sourceType.value = "";
    $sourceLabel.value = "";
    $tags.value = "";
    if ($mediaList) $mediaList.innerHTML = "";
  }

  /* =========================
     6. 폼 → 엔트리 변환
     ========================= */
  function formToEntry() {
    const id = $id.value.trim();
    if (!id) {
      throw new Error("ID는 필수입니다.");
    }

    const date = $date.value.trim() || "";

    const tagsRaw = $tags.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const media = [];
    if ($mediaList) {
      const rows = Array.from($mediaList.querySelectorAll(".media-row"));
      rows.forEach((row) => {
        const typeSel = row.querySelector(".media-type");
        const srcInput = row.querySelector(".media-src");
        const type = (typeSel?.value || "image").trim();
        const src = (srcInput?.value || "").trim();
        if (!src) return;
        media.push({ type, src });
      });
    }

    const entry = {
      id,
      date,
      tags: tagsRaw,
      images: media.filter((m) => m.type === "image").map((m) => m.src),
      media,
      source: {},
    };

    const st = $sourceType.value.trim();
    const sl = $sourceLabel.value.trim();
    if (st || sl) {
      entry.source = {
        type: st || undefined,
        label: sl || undefined,
      };
    }

    return entry;
  }

  /* =========================
     7. 서버 저장/삭제
     ========================= */
  async function saveEntryToServer(entry) {
    if (USE_MOCK) {
      const idx = entries.findIndex((e) => e.id === selectedId);
      if (idx >= 0) entries[idx] = entry;
      else entries.push(entry);
      sortEntries();
      return;
    }

    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    if (!res.ok) {
      throw new Error(`서버 저장 실패: ${res.status}`);
    }
  }

  async function deleteEntryFromServer(id) {
    if (USE_MOCK) {
      entries = entries.filter((e) => e.id !== id);
      sortEntries();
      return;
    }

    const url = `${API_BASE}/${encodeURIComponent(id)}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(`삭제 실패: ${res.status}`);
    }
  }

  /* =========================
     8. 이벤트 바인딩
     ========================= */
  if ($search) {
    $search.addEventListener("input", () => {
      renderList();
    });
  }

  if ($btnNew) {
    $btnNew.addEventListener("click", () => {
      clearForm();
      setStatus("새 항목 작성 중…");
    });
  }

  if ($btnReload) {
    $btnReload.addEventListener("click", () => {
      loadEntries();
    });
  }

  if ($btnAddImage) {
    $btnAddImage.addEventListener("click", () => {
      if ($mediaList) $mediaList.appendChild(createMediaRow({ type: "image" }));
    });
  }

  if ($btnAddVideo) {
    $btnAddVideo.addEventListener("click", () => {
      if ($mediaList) $mediaList.appendChild(createMediaRow({ type: "video" }));
    });
  }

  if ($btnDelete) {
    $btnDelete.addEventListener("click", async () => {
      if (!selectedId) {
        setStatus("선택된 항목이 없어요.", true);
        return;
      }
      if (!confirm(`정말 삭제할까요?\n${selectedId}`)) return;

      try {
        await deleteEntryFromServer(selectedId);
        clearForm();
        renderList();
        setStatus("삭제 완료.");
      } catch (err) {
        console.error(err);
        setStatus("삭제 중 오류가 발생했어요.", true);
      }
    });
  }

  if ($btnReset) {
    $btnReset.addEventListener("click", () => {
      if (selectedId) {
        const e = entries.find((x) => x.id === selectedId);
        if (e) fillForm(e);
      } else {
        clearForm();
      }
      setStatus("변경 사항을 초기화했어요.");
    });
  }

  if ($form) {
    $form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const entry = formToEntry();
        selectedId = entry.id;
        await saveEntryToServer(entry);

        if (!USE_MOCK) {
          await loadEntries();
        } else {
          renderList();
        }
        setStatus("저장 완료.");
      } catch (err) {
        console.error(err);
        setStatus(err.message || "저장 중 오류가 발생했어요.", true);
      }
    });
  }

  /* =========================
     9. 시작
     ========================= */
  loadEntries();
  setStatus("준비 완료.");
});
