// All image processing stays in this browser.
const $ = (s) => document.querySelector(s);
const imageInput = $("#image-input"), dropZone = $("#drop-zone"), uploadStatus = $("#upload-status");
const characterImage = $("#character-image"), emptyState = $("#empty-state");
const animationStatus = $("#animation-status"), resetButton = $("#reset-button"), stage = $("#stage");
const editorCanvas = $("#editor-canvas"), editorPlaceholder = $("#editor-placeholder");
const removeButton = $("#remove-background"), tolerance = $("#tolerance-control"), toleranceValue = $("#tolerance-value");
const eraseButton = $("#erase-tool"), brush = $("#brush-control"), brushValue = $("#brush-value");
const undoButton = $("#undo-button"), restoreButton = $("#restore-button"), editorHelp = $("#editor-help");
const mouthSelection = $("#mouth-selection"), setMouthButton = $("#set-mouth"), resetMouthButton = $("#reset-mouth");
const previewTalkButton = $("#preview-talk"), selectionHelp = $("#selection-help");
const eyeSelection = $("#eye-selection"), setEyesButton = $("#set-eyes"), resetEyesButton = $("#reset-eyes"), eyeSelectionHelp = $("#eye-selection-help");
const playWalkButton = $("#play-walk");
const createAnimationButton = $("#create-animation"), downloadAnimation = $("#download-animation"), exportStatus = $("#export-status");
const edit = editorCanvas.getContext("2d", { willReadFrequently: true }), preview = characterImage.getContext("2d");
const effectsBehind = $("#effects-behind"), effectsFront = $("#effects-front");
const behindContext = effectsBehind.getContext("2d"), frontContext = effectsFront.getContext("2d");
const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const talkDefaults = { style: "vertical", mouthMovement: "100", speed: "2", smoothness: "70", horizontal: "50", vertical: "100", loop: true };
let imageUrl, original, history = [], historyBytes = 0, erasing = false, drawing = false, autoApplied = false;
let baseMotion = "walk", animationStart = performance.now(), playing = true, mouthArea = null, eyeArea = null, selectingMouth = false, selectingEyes = false, selectionStart = null;
let talkOpened = false;
let exporting = false, exportUrl = null;

const decorativeDefinitions = {
  glow: { name: "Glow", layer: "behind", color: ["Color", "#71f6b5"], intensity: ["Intensity", 55, 0, 100, "%"], radius: ["Blur / radius", 22, 2, 60, " px"], pulse: ["Pulse", true] },
  neon: { name: "Neon Outline", layer: "behind", color: ["Color", "#43e8ff"], thickness: ["Thickness", 5, 1, 16, " px"], glow: ["Glow strength", 65, 0, 100, "%"], pulse: ["Pulse", false] },
  aura: { name: "Aura", layer: "behind", color: ["Color", "#9d73ff"], size: ["Size", 135, 80, 220, "%"], intensity: ["Intensity", 45, 0, 100, "%"], pulse: ["Animated pulse", true] },
  hearts: { name: "Hearts", layer: "front", amount: ["Amount", 14, 2, 40, ""], size: ["Size", 18, 6, 42, " px"], speed: ["Speed", 55, 10, 150, "%"], direction: ["Direction", "up", ["up", "down", "left", "right", "random"]], spread: ["Spread", 75, 20, 140, "%"] },
  stars: { name: "Stars", layer: "front", amount: ["Amount", 18, 2, 50, ""], size: ["Size", 14, 4, 36, " px"], speed: ["Twinkle speed", 80, 10, 200, "%"], spread: ["Spread", 80, 20, 150, "%"] },
  sparkles: { name: "Sparkles", layer: "front", amount: ["Amount", 25, 2, 70, ""], size: ["Size", 7, 2, 20, " px"], speed: ["Speed", 80, 10, 200, "%"], spread: ["Spread", 90, 20, 160, "%"], random: ["Random twinkle", true] },
  bubbles: { name: "Bubbles", layer: "front", amount: ["Amount", 16, 2, 45, ""], minSize: ["Minimum size", 7, 2, 30, " px"], maxSize: ["Maximum size", 25, 8, 60, " px"], speed: ["Speed", 60, 10, 160, "%"], opacity: ["Opacity", 55, 10, 100, "%"] },
  snow: { name: "Snow", layer: "front", amount: ["Amount", 28, 3, 80, ""], speed: ["Speed", 60, 10, 180, "%"], size: ["Size", 8, 2, 24, " px"], drift: ["Horizontal drift", 35, 0, 100, "%"] },
  confetti: { name: "Confetti", layer: "front", amount: ["Amount", 30, 3, 90, ""], speed: ["Speed", 70, 10, 180, "%"], spread: ["Spread", 90, 20, 160, "%"], gravity: ["Gravity", 65, 0, 150, "%"] },
  magicDust: { name: "Magic Dust", layer: "front", amount: ["Amount", 30, 3, 90, ""], speed: ["Speed", 45, 5, 140, "%"], color: ["Color", "#ffd978"], spread: ["Spread", 85, 20, 160, "%"] },
  fireflies: { name: "Fireflies", layer: "front", amount: ["Amount", 18, 2, 55, ""], glowSize: ["Glow size", 10, 3, 28, " px"], speed: ["Speed", 35, 5, 120, "%"], color: ["Color", "#dfff72"] },
  lightRays: { name: "Light Rays", layer: "behind", intensity: ["Intensity", 35, 0, 100, "%"], speed: ["Rotation speed", 25, 0, 120, "%"], count: ["Ray count", 10, 3, 24, ""] },
  halo: { name: "Halo", layer: "behind", color: ["Color", "#ffe38a"], size: ["Size", 120, 60, 200, "%"], intensity: ["Intensity", 60, 0, 100, "%"], pulse: ["Pulse", true] },
  shockwave: { name: "Shockwave", layer: "front", speed: ["Speed", 80, 10, 200, "%"], size: ["Size", 140, 50, 250, "%"], thickness: ["Thickness", 5, 1, 18, " px"], interval: ["Repeat interval", 140, 40, 300, "%"] },
  energyRing: { name: "Energy Ring", layer: "front", color: ["Color", "#6fffe0"], speed: ["Speed", 70, 0, 200, "%"], size: ["Size", 115, 50, 200, "%"], glow: ["Glow", 65, 0, 100, "%"] },
  actionLines: { name: "Cartoon Action Lines", layer: "front", amount: ["Amount", 16, 4, 36, ""], length: ["Length", 42, 10, 100, " px"], speed: ["Speed", 70, 0, 200, "%"], intensity: ["Intensity", 75, 10, 100, "%"] }
};
function createDecorativeControls() {
  const list = $("#decorative-list");
  Object.entries(decorativeDefinitions).forEach(([id, definition]) => {
    const article = document.createElement("article"); article.className = "decorative-effect";
    article.innerHTML = `<label class="decorative-summary"><input type="checkbox" data-decorative-toggle="${id}"><strong>${definition.name}</strong><small>${definition.layer}</small></label><div class="decorative-settings" data-decorative-settings="${id}" hidden></div>`;
    const settings = article.lastElementChild;
    settings.insertAdjacentHTML("beforeend", `<div class="setting-range"><div class="control-label"><label for="deco-${id}-master">Effect intensity</label><output id="deco-${id}-master-value">100%</output></div><input id="deco-${id}-master" data-deco-setting="master" type="range" min="0" max="100" value="100"></div>`);
    Object.entries(definition).forEach(([key, spec]) => {
      if (key === "name" || key === "layer") return;
      const inputId = `deco-${id}-${key}`;
      if (key === "color") settings.insertAdjacentHTML("beforeend", `<label class="decorative-color"><span>${spec[0]}</span><input id="${inputId}" data-deco-setting="${key}" type="color" value="${spec[1]}"></label>`);
      else if (typeof spec[1] === "boolean") settings.insertAdjacentHTML("beforeend", `<label class="decorative-check"><span>${spec[0]}</span><input id="${inputId}" data-deco-setting="${key}" type="checkbox" ${spec[1] ? "checked" : ""}></label>`);
      else if (Array.isArray(spec[2])) settings.insertAdjacentHTML("beforeend", `<label class="decorative-select"><span>${spec[0]}</span><select id="${inputId}" data-deco-setting="${key}">${spec[2].map((value) => `<option value="${value}" ${value === spec[1] ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}</select></label>`);
      else settings.insertAdjacentHTML("beforeend", `<div class="setting-range"><div class="control-label"><label for="${inputId}">${spec[0]}</label><output id="${inputId}-value">${spec[1]}${spec[5] || spec[4] || ""}</output></div><input id="${inputId}" data-deco-setting="${key}" type="range" min="${spec[2]}" max="${spec[3]}" value="${spec[1]}"></div>`);
    });
    list.appendChild(article);
  });
  list.addEventListener("change", (event) => { const toggle = event.target.closest("[data-decorative-toggle]"); if (toggle) $(`[data-decorative-settings="${toggle.dataset.decorativeToggle}"]`).hidden = !toggle.checked; if (original) playing = true; animationStart = performance.now(); clearExportDownload(); updateStatus(); });
  list.addEventListener("input", (event) => { if (event.target.type === "range") { const out = $(`#${event.target.id}-value`); if (out) { const def = decorativeDefinitions[event.target.closest(".decorative-effect").querySelector("[data-decorative-toggle]").dataset.decorativeToggle]; const spec = event.target.dataset.decoSetting === "master" ? null : def[event.target.dataset.decoSetting]; out.value = `${event.target.value}${spec ? spec[5] || spec[4] || "" : "%"}`; } fillRange(event.target); } if (original) playing = true; clearExportDownload(); updateStatus(); });
}
function captureDecorativeConfig() {
  const result = {};
  document.querySelectorAll("[data-decorative-toggle]").forEach((toggle) => { const id = toggle.dataset.decorativeToggle, values = { enabled: toggle.checked, layer: decorativeDefinitions[id].layer }; toggle.closest(".decorative-effect").querySelectorAll("[data-deco-setting]").forEach((input) => { values[input.dataset.decoSetting] = input.type === "checkbox" ? input.checked : input.type === "color" || input.tagName === "SELECT" ? input.value : Number(input.value); }); result[id] = values; });
  return result;
}

function fillRange(input) {
  input.style.setProperty("--range-progress", `${(input.value - input.min) / (input.max - input.min) * 100}%`);
}
function updateStatus() {
  const active = Boolean(original) && playing;
  animationStatus.classList.toggle("active", active);
  animationStatus.innerHTML = `<span></span>${active ? "Animating" : original ? "Paused" : "Ready"}`;
}
function updateControls() {
  const values = {
    "walk-speed": `${Number($("#walk-speed").value).toFixed(1)}×`, "travel-distance": `${$("#travel-distance").value}%`,
    "bob-amount": `${$("#bob-amount").value} px`, "step-tilt": `${$("#step-tilt").value}°`,
    "side-step-speed": `${Number($("#side-step-speed").value).toFixed(1)}×`, "side-step-height": `${$("#side-step-height").value} px`,
    "side-step-tilt": `${$("#side-step-tilt").value}°`, "side-step-width": `${$("#side-step-width").value} px`, "side-squash-stretch": `${$("#side-squash-stretch").value}%`,
    "jump-height": `${$("#jump-height").value} px`, "jump-speed": `${Number($("#jump-speed").value).toFixed(1)}×`,
    "squash-stretch": `${$("#squash-stretch").value}%`, "mouth-movement": `${$("#mouth-movement").value}%`,
    "talk-speed": `${Number($("#talk-speed").value).toFixed(1)}×`, "talk-smoothness": `${$("#talk-smoothness").value}%`,
    "horizontal-movement": `${$("#horizontal-movement").value}%`, "vertical-movement": `${$("#vertical-movement").value}%`,
    "float-speed": `${Number($("#float-speed").value).toFixed(1)}×`, "float-amount": `${$("#float-amount").value} px`,
    "blink-amount": `${$("#blink-amount").value}%`, "blink-speed": `${Number($("#blink-speed").value).toFixed(1)}×`,
    "breathe-intensity": `${$("#breathe-intensity").value}%`, "breathe-speed": `${Number($("#breathe-speed").value).toFixed(1)}×`,
    "shake-intensity": `${$("#shake-intensity").value} px`, "shake-speed": `${Number($("#shake-speed").value).toFixed(1)}×`,
    "pulse-intensity": `${$("#pulse-intensity").value}%`, "pulse-speed": `${Number($("#pulse-speed").value).toFixed(1)}×`,
    "wiggle-angle": `${$("#wiggle-angle").value}°`, "wiggle-speed": `${Number($("#wiggle-speed").value).toFixed(1)}×`
  };
  Object.entries(values).forEach(([id, value]) => { $(`#${id}-value`).value = value; fillRange($(`#${id}`)); });
  [tolerance, brush].forEach(fillRange);
  updateStatus();
}
function resetTalkSettings() {
  $(`input[name="talk-style"][value="${talkDefaults.style}"]`).checked = true;
  $("#mouth-movement").value = talkDefaults.mouthMovement;
  $("#talk-speed").value = talkDefaults.speed;
  $("#talk-smoothness").value = talkDefaults.smoothness;
  $("#horizontal-movement").value = talkDefaults.horizontal;
  $("#vertical-movement").value = talkDefaults.vertical;
  $("#talk-loop").checked = talkDefaults.loop;
  updateControls();
}
function enableEditor(on) {
  [removeButton, tolerance, eraseButton, brush, restoreButton].forEach((el) => { el.disabled = !on; });
  undoButton.disabled = !on || !history.length;
}
function snapshot() {
  const state = edit.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
  history.push(state); historyBytes += state.data.byteLength;
  while (history.length > 1 && (history.length > 12 || historyBytes > 96 * 1024 * 1024)) historyBytes -= history.shift().data.byteLength;
  undoButton.disabled = false;
}
function syncPreview() {
  characterImage.width = editorCanvas.width; characterImage.height = editorCanvas.height;
  preview.clearRect(0, 0, characterImage.width, characterImage.height);
  preview.drawImage(editorCanvas, 0, 0);
  characterImage.hidden = false; emptyState.hidden = true;
  updateMouthOverlay(); updateEyeOverlay();
}
function loadImage(file) {
  if (!file || !acceptedTypes.has(file.type)) { uploadStatus.textContent = "Please choose a PNG, JPG, or WebP image."; return; }
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    editorCanvas.width = img.naturalWidth; editorCanvas.height = img.naturalHeight;
    edit.drawImage(img, 0, 0); original = edit.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
    history = []; historyBytes = 0; autoApplied = false; enableEditor(true); playWalkButton.disabled = createAnimationButton.disabled = false; syncPreview(); editorPlaceholder.hidden = true;
    clearExportDownload(); exportStatus.textContent = "Ready to export the selected animation.";
    mouthArea = eyeArea = null; resetMouthButton.disabled = previewTalkButton.disabled = resetEyesButton.disabled = true; mouthSelection.hidden = eyeSelection.hidden = true;
    resetTalkSettings();
    uploadStatus.textContent = `${file.name} · ${img.naturalWidth} × ${img.naturalHeight}`;
    editorHelp.textContent = "Ready. Try automatic removal or choose Erase for manual cleanup.";
    animationStart = performance.now(); updateWalkButton(); updateStatus();
  };
  img.onerror = () => { uploadStatus.textContent = "That image could not be opened. Please try another."; };
  img.src = imageUrl;
}
function edgeColor(data, width, height) {
  const bins = new Map();
  const add = (x, y) => {
    const p = (y * width + x) * 4, key = `${data[p] >> 4},${data[p + 1] >> 4},${data[p + 2] >> 4}`;
    const b = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += data[p]; b.g += data[p + 1]; b.b += data[p + 2]; bins.set(key, b);
  };
  const xs = Math.max(1, Math.floor(width / 400)), ys = Math.max(1, Math.floor(height / 400));
  for (let x = 0; x < width; x += xs) { add(x, 0); add(x, height - 1); }
  for (let y = 0; y < height; y += ys) { add(0, y); add(width - 1, y); }
  const b = [...bins.values()].sort((a, z) => z.n - a.n)[0];
  return [b.r / b.n, b.g / b.n, b.b / b.n];
}
function removeBackground(remember = true) {
  if (!original) return;
  if (remember) snapshot();
  const image = new ImageData(new Uint8ClampedArray(original.data), original.width, original.height);
  const { data, width, height } = image, bg = edgeColor(data, width, height);
  const limit = (Number(tolerance.value) * 4.42) ** 2, seen = new Uint8Array(width * height), queue = new Uint32Array(width * height);
  let head = 0, tail = 0;
  const add = (i) => {
    if (seen[i]) return;
    const p = i * 4, dr = data[p] - bg[0], dg = data[p + 1] - bg[1], db = data[p + 2] - bg[2];
    if (data[p + 3] && dr * dr + dg * dg + db * db <= limit) { seen[i] = 1; queue[tail++] = i; }
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++], x = i % width; data[i * 4 + 3] = 0;
    if (x) add(i - 1); if (x + 1 < width) add(i + 1); if (i >= width) add(i - width); if (i + width < width * height) add(i + width);
  }
  edit.putImageData(image, 0, 0); autoApplied = true; syncPreview();
  editorHelp.textContent = `Removed ${tail.toLocaleString()} connected background pixels.`;
}
function eraseAt(event) {
  const rect = editorCanvas.getBoundingClientRect(), scale = editorCanvas.width / rect.width;
  const x = (event.clientX - rect.left) * scale, y = (event.clientY - rect.top) * editorCanvas.height / rect.height;
  edit.save(); edit.globalCompositeOperation = "destination-out"; edit.beginPath();
  edit.arc(x, y, Number(brush.value) * scale / 2, 0, Math.PI * 2); edit.fill(); edit.restore(); syncPreview();
}
function resetPreviewPose() {
  characterImage.style.transform = "translate3d(0,0,0) rotate(0deg) scale(1,1)";
  if (original) { preview.clearRect(0, 0, characterImage.width, characterImage.height); preview.drawImage(editorCanvas, 0, 0); }
}
function updateWalkButton() {
  playWalkButton.textContent = original && playing && baseMotion === "walk" ? "Pause Walk" : "Play Walk";
}
function selectWalkStyle(style) {
  document.querySelectorAll("[data-walk-settings]").forEach((panel) => { panel.hidden = panel.dataset.walkSettings !== style; });
  resetPreviewPose(); animationStart = performance.now(); updateWalkButton(); updateStatus();
}
function updateMouthOverlay(draft = mouthArea) {
  if (!draft || !original || !$("[data-effect-toggle=\"talk\"]").checked) { mouthSelection.hidden = true; return; }
  const rect = characterImage.getBoundingClientRect(), stageRect = stage.getBoundingClientRect();
  mouthSelection.style.left = `${rect.left - stageRect.left + draft.x / characterImage.width * rect.width}px`;
  mouthSelection.style.top = `${rect.top - stageRect.top + draft.y / characterImage.height * rect.height}px`;
  mouthSelection.style.width = `${draft.width / characterImage.width * rect.width}px`;
  mouthSelection.style.height = `${draft.height / characterImage.height * rect.height}px`;
  mouthSelection.hidden = false;
}
function updateEyeOverlay(draft = eyeArea) {
  if (!draft || !original || !$("[data-effect-toggle=\"blink\"]").checked) { eyeSelection.hidden = true; return; }
  const rect = characterImage.getBoundingClientRect(), stageRect = stage.getBoundingClientRect();
  eyeSelection.style.left = `${rect.left - stageRect.left + draft.x / characterImage.width * rect.width}px`;
  eyeSelection.style.top = `${rect.top - stageRect.top + draft.y / characterImage.height * rect.height}px`;
  eyeSelection.style.width = `${draft.width / characterImage.width * rect.width}px`;
  eyeSelection.style.height = `${draft.height / characterImage.height * rect.height}px`;
  eyeSelection.hidden = false;
}
function selectBaseMotion(next) {
  baseMotion = next; playing = true; selectingMouth = selectingEyes = false; selectionStart = null; animationStart = performance.now();
  resetPreviewPose();
  document.querySelectorAll("[data-base-settings]").forEach((panel) => { panel.hidden = panel.dataset.baseSettings !== baseMotion; });
  stage.classList.remove("selecting-mouth"); setMouthButton.classList.remove("active"); setEyesButton.classList.remove("active");
  previewTalkButton.textContent = "Preview Talk"; updateWalkButton(); updateMouthOverlay(); updateEyeOverlay(); updateStatus();
}
function mouthPoint(event) {
  const rect = characterImage.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(characterImage.width, (event.clientX - rect.left) / rect.width * characterImage.width)),
    y: Math.max(0, Math.min(characterImage.height, (event.clientY - rect.top) / rect.height * characterImage.height))
  };
}
function currentTalkSettings() {
  return {
    style: $('input[name="talk-style"]:checked').value, amount: Number($("#mouth-movement").value) / 100,
    horizontal: Number($("#horizontal-movement").value) / 100, vertical: Number($("#vertical-movement").value) / 100,
    smoothness: Number($("#talk-smoothness").value) / 100
  };
}
function talkDeformation(progress, settings = currentTalkSettings()) {
  const { style, amount, smoothness } = settings;
  const horizontal = settings.horizontal * amount, vertical = settings.vertical * amount;
  const shape = (value) => Math.pow(Math.max(0, Math.min(1, value)), 2.2 - smoothness * 1.6);
  const wave = shape(Math.sin(progress * Math.PI) ** 2), rawLateral = Math.sin(progress * Math.PI * 2);
  const lateral = Math.sign(rawLateral) * shape(Math.abs(rawLateral));
  let scaleX = 1, scaleY = 1, shiftX = 0;

  if (style === "vertical") scaleY += wave * vertical;
  else if (style === "horizontal") { scaleX += lateral * .28 * horizontal; shiftX = lateral * .035 * horizontal; }
  else if (style === "open-wide") { scaleX += wave * .32 * horizontal; scaleY += wave * vertical; }
  else if (style === "side-to-side") { scaleY += wave * .16 * vertical; shiftX = lateral * .09 * horizontal; }
  else if (style === "squash") {
    const statesX = [1, 1 + .36 * horizontal, 1, 1 + .36 * horizontal, 1];
    const statesY = [1, Math.max(.7, 1 - .18 * vertical), 1 + vertical, Math.max(.7, 1 - .18 * vertical), 1];
    const position = Math.min(progress, .999999) * 4, segment = Math.floor(position), local = position - segment;
    const smoothStep = local * local * (3 - 2 * local), snapPower = 1 + (1 - smoothness) * 3;
    const blend = smoothStep < .5 ? .5 * (smoothStep * 2) ** snapPower : 1 - .5 * ((1 - smoothStep) * 2) ** snapPower;
    scaleX = statesX[segment] + (statesX[segment + 1] - statesX[segment]) * blend;
    scaleY = statesY[segment] + (statesY[segment + 1] - statesY[segment]) * blend;
  } else if (style === "o-shape") { scaleX -= wave * .3 * horizontal; scaleY += wave * .9 * vertical; }
  return { scaleX, scaleY, shiftX };
}
function drawTalkPatch(target, source, progress, area = mouthArea, settings = currentTalkSettings()) {
  if (!area) return;
  const { scaleX, scaleY, shiftX } = talkDeformation(progress, settings);
  // Re-sample the untouched editor canvas into the fixed mouth rectangle every frame.
  const a = area, centerX = a.x + a.width / 2, centerY = a.y + a.height / 2;
  const sourceWidth = a.width / Math.max(.2, scaleX), sourceHeight = a.height / Math.max(.2, scaleY);
  const sourceX = centerX - sourceWidth / 2 - shiftX * a.width / Math.max(.2, scaleX);
  const sourceY = centerY - sourceHeight / 2;
  target.save(); target.beginPath(); target.rect(a.x, a.y, a.width, a.height); target.clip();
  target.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, a.x, a.y, a.width, a.height); target.restore();
}
function blinkWave(time, settings) {
  const speed = settings.speed, duration = .18 / speed;
  if (!settings.random) {
    const local = time % (2.4 / speed);
    return local < duration ? Math.sin(local / duration * Math.PI) ** 2 : 0;
  }
  let cursor = 0, index = 0;
  while (cursor <= time) {
    const random = Math.abs(Math.sin((index + 1) * 91.733) * 43758.5453) % 1;
    const start = cursor + (1.5 + random * 2.6) / speed;
    if (time >= start && time < start + duration) return Math.sin((time - start) / duration * Math.PI) ** 2;
    cursor = start + duration; index++;
  }
  return 0;
}
function drawBlinkPatch(target, source, time, area, settings) {
  if (!area) return;
  const scaleY = Math.max(.08, 1 - blinkWave(time, settings) * settings.amount * .92);
  const sourceHeight = area.height / scaleY, sourceY = area.y + area.height / 2 - sourceHeight / 2;
  target.save(); target.beginPath(); target.rect(area.x, area.y, area.width, area.height); target.clip();
  target.drawImage(source, area.x, sourceY, area.width, sourceHeight, area.x, area.y, area.width, area.height); target.restore();
}
function drawDeformedFrame(target, source, width, height, time, config) {
  target.clearRect(0, 0, width, height); target.drawImage(source, 0, 0);
  if (config.effects.talk && config.mouth) {
    const raw = time / (1.2 / config.talkSpeed), progress = config.talkLoop || raw < 1 ? raw % 1 : 0;
    drawTalkPatch(target, source, progress, config.mouth, config.talk);
  }
  if (config.effects.blink && config.eyes) drawBlinkPatch(target, source, time, config.eyes, config.blink);
}
function renderTalk(progress) {
  preview.clearRect(0, 0, characterImage.width, characterImage.height); preview.drawImage(editorCanvas, 0, 0);
  drawTalkPatch(preview, editorCanvas, progress);
}
function captureAnimationConfig() {
  const effects = {};
  document.querySelectorAll("[data-effect-toggle]").forEach((input) => { effects[input.dataset.effectToggle] = input.checked; });
  return {
    baseMotion, effects, walkStyle: $('input[name="walk-style"]:checked').value,
    walkSpeed: Number($("#walk-speed").value), travelDistance: Number($("#travel-distance").value), bob: Number($("#bob-amount").value), walkTilt: Number($("#step-tilt").value),
    walkLoop: $("#walk-loop").checked,
    sideSpeed: Number($("#side-step-speed").value), sideHeight: Number($("#side-step-height").value), sideTilt: Number($("#side-step-tilt").value), sideWidth: Number($("#side-step-width").value), sideSquash: Number($("#side-squash-stretch").value) / 100,
    sideLoop: $("#side-walk-loop").checked, direction: Number($("[data-walk-direction].active").dataset.walkDirection),
    jumpHeight: Number($("#jump-height").value), jumpSpeed: Number($("#jump-speed").value), jumpSquash: Number($("#squash-stretch").value) / 100, jumpLoop: $("#jump-loop").checked,
    floatSpeed: Number($("#float-speed").value), floatAmount: Number($("#float-amount").value), floatDrift: $("#float-drift").checked,
    talkSpeed: Number($("#talk-speed").value), talkLoop: $("#talk-loop").checked, talk: currentTalkSettings(), mouth: mouthArea ? { ...mouthArea } : null,
    blink: { amount: Number($("#blink-amount").value) / 100, speed: Number($("#blink-speed").value), random: $("#random-blink").checked }, eyes: eyeArea ? { ...eyeArea } : null,
    breatheIntensity: Number($("#breathe-intensity").value) / 100, breatheSpeed: Number($("#breathe-speed").value),
    shakeIntensity: Number($("#shake-intensity").value), shakeSpeed: Number($("#shake-speed").value),
    pulseIntensity: Number($("#pulse-intensity").value) / 100, pulseSpeed: Number($("#pulse-speed").value),
    wiggleAngle: Number($("#wiggle-angle").value), wiggleSpeed: Number($("#wiggle-speed").value),
    decorative: captureDecorativeConfig(), sourceWidth: editorCanvas.width,
    previewWidth: Math.max(1, characterImage.clientWidth), previewHeight: Math.max(1, characterImage.clientHeight),
    stageWidth: stage.clientWidth, stageHeight: stage.clientHeight
  };
}
function basePoseAt(time, config) {
  let x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1;
  if (config.baseMotion === "walk" && config.walkStyle === "forward-back") {
    const duration = 3 / config.walkSpeed, raw = time / duration;
    if (!config.walkLoop && raw >= 1) return { x, y, rotation, scaleX, scaleY };
    const progress = raw % 1;
    const available = Math.max(0, config.stageWidth - config.previewWidth - 28), travel = available * config.travelDistance / 100;
    const travelPhase = config.walkLoop ? (1 - Math.cos(progress * Math.PI * 2)) / 2 : progress * progress * (3 - 2 * progress);
    x = (travelPhase - .5) * travel; y = -Math.abs(Math.sin(progress * Math.PI * 4)) * config.bob;
    rotation = Math.sin(progress * Math.PI * 4) * config.walkTilt;
  } else if (config.baseMotion === "walk") {
    const raw = time / (1.5 / config.sideSpeed); if (!config.sideLoop && raw >= 1) return { x, y, rotation, scaleX, scaleY }; const progress = raw % 1;
    const lift = Math.abs(Math.sin(progress * Math.PI * 2)), contact = 1 - lift;
    scaleY = 1 + lift * config.sideSquash * .55 - contact * config.sideSquash * .35;
    scaleX = 1 - lift * config.sideSquash * .08 + contact * config.sideSquash * .16;
    x = config.direction * config.sideWidth * (1 - Math.cos(progress * Math.PI * 4)) / 2;
    rotation = config.direction * Math.sin(progress * Math.PI * 2) * config.sideTilt;
    y = -lift * config.sideHeight - (scaleY - 1) * config.previewHeight / 2;
  } else if (config.baseMotion === "jump") {
    const raw = time / (1.65 / config.jumpSpeed); if (!config.jumpLoop && raw >= 1) return { x, y, rotation, scaleX, scaleY }; const progress = raw % 1;
    const p = progress, amount = config.jumpSquash, height = Math.min(config.jumpHeight, config.stageHeight * .38);
    if (p < .14) { const q = Math.sin(p / .14 * Math.PI / 2); scaleX = 1 + amount * q; scaleY = 1 - amount * q; }
    else if (p < .72) { const q = (p - .14) / .58; y = -Math.sin(q * Math.PI) * height; const stretch = Math.sin(q * Math.PI) * amount * .55; scaleX = 1 - stretch * .45; scaleY = 1 + stretch; }
    else if (p < .86) { const q = Math.sin((p - .72) / .14 * Math.PI); scaleX = 1 + amount * q; scaleY = 1 - amount * q; }
  } else if (config.baseMotion === "float") {
    const progress = time / (3.6 / config.floatSpeed) * Math.PI * 2;
    y = -Math.sin(progress) * config.floatAmount; if (config.floatDrift) x = Math.sin(progress * .5) * config.floatAmount * .45;
  }
  return { x, y, rotation, scaleX, scaleY };
}
function compositePoseAt(time, config) {
  const pose = basePoseAt(time, config);
  if (config.effects.breathe) {
    const wave = (1 - Math.cos(time / (3 / config.breatheSpeed) * Math.PI * 2)) / 2, breatheScale = 1 + wave * config.breatheIntensity;
    pose.y -= (breatheScale - 1) * config.previewHeight / 2; pose.scaleY *= breatheScale; pose.scaleX *= 1 + wave * config.breatheIntensity * .18;
  }
  if (config.effects.shake) {
    const phase = time * config.shakeSpeed * Math.PI * 8;
    pose.x += Math.sin(phase) * config.shakeIntensity; pose.y += Math.sin(phase * 1.37 + .7) * config.shakeIntensity * .65;
  }
  if (config.effects.pulse) {
    const pulse = 1 + Math.sin(time / (1.8 / config.pulseSpeed) * Math.PI) ** 2 * config.pulseIntensity;
    pose.scaleX *= pulse; pose.scaleY *= pulse;
  }
  if (config.effects.wiggle) pose.rotation += Math.sin(time / (2 / config.wiggleSpeed) * Math.PI * 2) * config.wiggleAngle;
  return pose;
}
function exportPose(time, config) {
  const pose = compositePoseAt(time, config);
  const sourceScale = config.sourceWidth / config.previewWidth;
  return { x: pose.x * sourceScale, y: pose.y * sourceScale, rotation: pose.rotation * Math.PI / 180, scaleX: pose.scaleX, scaleY: pose.scaleY };
}
function seeded(index, salt = 0) { const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453; return value - Math.floor(value); }
function rgba(hex, alpha) { const value = hex.replace("#", ""); return `rgba(${parseInt(value.slice(0, 2), 16)},${parseInt(value.slice(2, 4), 16)},${parseInt(value.slice(4, 6), 16)},${Math.max(0, Math.min(1, alpha))})`; }
function starPath(context, x, y, radius, points = 5) { context.beginPath(); for (let i = 0; i < points * 2; i++) { const r = i % 2 ? radius * .42 : radius, angle = -Math.PI / 2 + i * Math.PI / points; context.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r); } context.closePath(); }
function characterSilhouette(context, source, metrics, blur, color, opacity = 1) {
  context.save(); context.globalAlpha = opacity; context.filter = `drop-shadow(0 0 ${blur}px ${color}) drop-shadow(0 0 ${Math.max(1, blur * .55)}px ${color})`;
  context.translate(metrics.cx, metrics.cy); context.rotate(metrics.rotation); context.scale(metrics.scaleX, metrics.scaleY); context.drawImage(source, -metrics.width / 2, -metrics.height / 2, metrics.width, metrics.height); context.restore();
}
function drawDecorativeLayer(context, layer, time, decorative, metrics, source) {
  const radius = Math.max(metrics.width, metrics.height) * .54;
  const active = (id) => decorative[id] && decorative[id].enabled && decorative[id].layer === layer;
  const alpha = (effect) => effect.master / 100;
  if (active("lightRays")) { const e = decorative.lightRays; context.save(); context.translate(metrics.cx, metrics.cy); context.rotate(time * e.speed / 100); context.globalCompositeOperation = "screen"; for (let i = 0; i < e.count; i++) { const a = i * Math.PI * 2 / e.count, width = Math.PI / e.count * .35; context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, radius * 1.6, a - width, a + width); context.closePath(); const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius * 1.6); gradient.addColorStop(0, rgba("#fff4bd", e.intensity / 100 * alpha(e) * .45)); gradient.addColorStop(1, "rgba(255,244,189,0)"); context.fillStyle = gradient; context.fill(); } context.restore(); }
  if (active("aura")) { const e = decorative.aura, pulse = e.pulse ? 1 + Math.sin(time * 2.4) * .08 : 1, r = radius * e.size / 100 * pulse; const gradient = context.createRadialGradient(metrics.cx, metrics.cy, r * .15, metrics.cx, metrics.cy, r); gradient.addColorStop(0, rgba(e.color, e.intensity / 100 * alpha(e) * .65)); gradient.addColorStop(1, rgba(e.color, 0)); context.fillStyle = gradient; context.beginPath(); context.ellipse(metrics.cx, metrics.cy, r, r * .92, 0, 0, Math.PI * 2); context.fill(); }
  if (active("halo")) { const e = decorative.halo, pulse = e.pulse ? 1 + Math.sin(time * 3) * .06 : 1, r = radius * e.size / 100 * pulse; context.save(); context.strokeStyle = rgba(e.color, e.intensity / 100 * alpha(e)); context.shadowColor = e.color; context.shadowBlur = r * .14; context.lineWidth = Math.max(3, r * .05); context.beginPath(); context.ellipse(metrics.cx, metrics.cy - metrics.height * .08, r, r * .78, 0, 0, Math.PI * 2); context.stroke(); context.restore(); }
  if (active("glow")) { const e = decorative.glow, pulse = e.pulse ? .82 + Math.sin(time * 3) * .18 : 1; characterSilhouette(context, source, metrics, e.radius, e.color, e.intensity / 100 * alpha(e) * pulse); }
  if (active("neon")) { const e = decorative.neon, pulse = e.pulse ? .78 + Math.sin(time * 4) * .22 : 1; for (let i = 0; i < Math.max(1, Math.round(e.thickness / 2)); i++) characterSilhouette(context, source, metrics, e.thickness + e.glow * .18, e.color, .16 * alpha(e) * pulse); }
  const particle = (id, draw) => { if (!active(id)) return; const e = decorative[id], count = Math.round(e.amount || 1), spread = (e.spread || 100) / 100; context.save(); context.globalAlpha = alpha(e); for (let i = 0; i < count; i++) draw(e, i, spread); context.restore(); };
  particle("hearts", (e, i, spread) => { const cycle = (seeded(i, 2) + time * e.speed / 600) % 1, angle = seeded(i, 3) * Math.PI * 2, distance = radius * (.35 + seeded(i, 4) * spread); let x = metrics.cx + Math.cos(angle) * distance, y = metrics.cy + Math.sin(angle) * distance; const travel = (cycle - .5) * radius; if (e.direction === "up") y -= travel; else if (e.direction === "down") y += travel; else if (e.direction === "left") x -= travel; else if (e.direction === "right") x += travel; else { x += Math.sin(time + i) * radius * .12; y += Math.cos(time * .8 + i) * radius * .12; } const s = e.size * (.65 + seeded(i, 5) * .7); context.save(); context.translate(x, y); context.scale(s / 20, s / 20); context.fillStyle = rgba("#ff6f9f", .45 + .55 * Math.sin(cycle * Math.PI)); context.beginPath(); context.moveTo(0, 7); context.bezierCurveTo(-18, -5, -10, -18, 0, -8); context.bezierCurveTo(10, -18, 18, -5, 0, 7); context.fill(); context.restore(); });
  particle("stars", (e, i, spread) => { const a = seeded(i, 8) * Math.PI * 2, d = radius * (.5 + seeded(i, 9) * spread), twinkle = .25 + .75 * Math.abs(Math.sin(time * e.speed / 35 + i)); context.fillStyle = rgba("#ffe889", twinkle); starPath(context, metrics.cx + Math.cos(a) * d, metrics.cy + Math.sin(a) * d, e.size * (.5 + seeded(i, 10))); context.fill(); });
  particle("sparkles", (e, i, spread) => { const a = seeded(i, 12) * Math.PI * 2 + time * e.speed / 500, d = radius * (.25 + seeded(i, 13) * spread), twinkle = e.random ? Math.abs(Math.sin(time * (1 + seeded(i, 14) * 5) + i)) : Math.abs(Math.sin(time * e.speed / 30)); const x = metrics.cx + Math.cos(a) * d, y = metrics.cy + Math.sin(a * 1.3) * d; context.strokeStyle = rgba("#ffffff", twinkle); context.lineWidth = 1.5; context.beginPath(); context.moveTo(x - e.size, y); context.lineTo(x + e.size, y); context.moveTo(x, y - e.size); context.lineTo(x, y + e.size); context.stroke(); });
  particle("bubbles", (e, i) => { const size = e.minSize + seeded(i, 16) * Math.max(0, e.maxSize - e.minSize), cycle = (seeded(i, 17) + time * e.speed / 500) % 1, x = metrics.cx + (seeded(i, 18) - .5) * radius * 2, y = metrics.cy + radius - cycle * radius * 2; context.strokeStyle = rgba("#c9f5ff", e.opacity / 100); context.lineWidth = Math.max(1, size * .08); context.beginPath(); context.arc(x, y, size / 2, 0, Math.PI * 2); context.stroke(); });
  particle("snow", (e, i) => { const cycle = (seeded(i, 20) + time * e.speed / 450) % 1, x = metrics.cx + (seeded(i, 21) - .5) * radius * 2.4 + Math.sin(time + i) * e.drift / 100 * radius * .25, y = metrics.cy - radius + cycle * radius * 2; context.fillStyle = "rgba(255,255,255,.85)"; context.beginPath(); context.arc(x, y, e.size * (.45 + seeded(i, 22) * .55) / 2, 0, Math.PI * 2); context.fill(); });
  particle("confetti", (e, i, spread) => { const cycle = (seeded(i, 24) + time * e.speed / 500) % 1, x = metrics.cx + (seeded(i, 25) - .5) * radius * 2 * spread + Math.sin(time * 2 + i) * 8, y = metrics.cy - radius + cycle * radius * (1.5 + e.gravity / 100); context.save(); context.translate(x, y); context.rotate(time * 4 + i); context.fillStyle = ["#ff657f", "#ffd65c", "#68e6be", "#75a7ff", "#d47bff"][i % 5]; context.fillRect(-4, -7, 8, 14); context.restore(); });
  const glowingParticle = (id, defaultColor, wandering) => particle(id, (e, i, spread) => { const speed = e.speed / 100, a = seeded(i, 28) * Math.PI * 2 + time * speed * (wandering ? .55 : .18), d = radius * (.25 + seeded(i, 29) * (spread || .9)), x = metrics.cx + Math.cos(a * (1 + seeded(i, 30))) * d, y = metrics.cy + Math.sin(a * (1.3 + seeded(i, 31))) * d, size = e.glowSize || 3 + seeded(i, 32) * 5, color = e.color || defaultColor; context.save(); context.fillStyle = color; context.shadowColor = color; context.shadowBlur = size * 1.8; context.globalAlpha *= .4 + .6 * Math.abs(Math.sin(time * (1 + seeded(i, 33) * 2) + i)); context.beginPath(); context.arc(x, y, Math.max(1.2, size * .25), 0, Math.PI * 2); context.fill(); context.restore(); });
  glowingParticle("magicDust", "#ffd978", false); glowingParticle("fireflies", "#dfff72", true);
  if (active("shockwave")) { const e = decorative.shockwave, cycle = (time * e.speed / 100 / Math.max(.4, e.interval / 100)) % 1, r = radius * e.size / 100 * cycle; context.save(); context.globalAlpha = alpha(e) * (1 - cycle); context.strokeStyle = "#d7fff5"; context.shadowColor = "#8bffe1"; context.shadowBlur = 12; context.lineWidth = e.thickness; context.beginPath(); context.arc(metrics.cx, metrics.cy, r, 0, Math.PI * 2); context.stroke(); context.restore(); }
  if (active("energyRing")) { const e = decorative.energyRing, r = radius * e.size / 100; context.save(); context.translate(metrics.cx, metrics.cy); context.rotate(time * e.speed / 55); context.globalAlpha = alpha(e); context.strokeStyle = e.color; context.shadowColor = e.color; context.shadowBlur = e.glow * .22; context.lineWidth = Math.max(2, r * .025); context.setLineDash([r * .35, r * .1]); context.beginPath(); context.ellipse(0, metrics.height * .12, r, r * .35, 0, 0, Math.PI * 2); context.stroke(); context.restore(); }
  if (active("actionLines")) { const e = decorative.actionLines; context.save(); context.translate(metrics.cx, metrics.cy); context.rotate(time * e.speed / 300); context.globalAlpha = alpha(e) * e.intensity / 100; context.strokeStyle = "#fff5cf"; context.lineWidth = 3; for (let i = 0; i < e.amount; i++) { const a = i * Math.PI * 2 / e.amount, start = radius * (1.02 + seeded(i, 36) * .25), length = e.length * (.55 + seeded(i, 37) * .7); context.beginPath(); context.moveTo(Math.cos(a) * start, Math.sin(a) * start); context.lineTo(Math.cos(a) * (start + length), Math.sin(a) * (start + length)); context.stroke(); } context.restore(); }
}
function renderPreviewDecorations(time, config, pose) {
  const width = stage.clientWidth, height = stage.clientHeight, dpr = window.devicePixelRatio || 1;
  [effectsBehind, effectsFront].forEach((canvas) => { if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); } canvas.hidden = !original; });
  behindContext.setTransform(dpr, 0, 0, dpr, 0, 0); frontContext.setTransform(dpr, 0, 0, dpr, 0, 0); behindContext.clearRect(0, 0, width, height); frontContext.clearRect(0, 0, width, height);
  const metrics = { cx: width / 2 + pose.x, cy: height / 2 + pose.y, width: characterImage.clientWidth, height: characterImage.clientHeight, rotation: pose.rotation * Math.PI / 180, scaleX: pose.scaleX, scaleY: pose.scaleY };
  drawDecorativeLayer(behindContext, "behind", time, config.decorative, metrics, editorCanvas); drawDecorativeLayer(frontContext, "front", time, config.decorative, metrics, editorCanvas);
}
function animate(now) {
  if (!original || !playing || selectingMouth || selectingEyes) { requestAnimationFrame(animate); return; }
  const elapsed = (now - animationStart) / 1000, config = captureAnimationConfig(), pose = compositePoseAt(elapsed, config);
  drawDeformedFrame(preview, editorCanvas, characterImage.width, characterImage.height, elapsed, config);
  renderPreviewDecorations(elapsed, config, pose);
  characterImage.style.transform = `translate3d(${pose.x}px,${pose.y}px,0) rotate(${pose.rotation}deg) scale(${pose.scaleX},${pose.scaleY})`;
  requestAnimationFrame(animate);
}
function poseBounds(pose, width, height) {
  const cosine = Math.cos(pose.rotation), sine = Math.sin(pose.rotation), points = [];
  for (const dx of [-width / 2, width / 2]) for (const dy of [-height / 2, height / 2]) {
    const sx = dx * pose.scaleX, sy = dy * pose.scaleY;
    points.push({ x: width / 2 + pose.x + sx * cosine - sy * sine, y: height / 2 + pose.y + sx * sine + sy * cosine });
  }
  return { minX: Math.min(...points.map((p) => p.x)), maxX: Math.max(...points.map((p) => p.x)), minY: Math.min(...points.map((p) => p.y)), maxY: Math.max(...points.map((p) => p.y)) };
}
function prepareExport(config, format, requestedSize, duration, fps) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const samples = Math.min(1200, Math.max(240, Math.ceil(duration * 60), Math.ceil(duration * fps)));
  for (let i = 0; i <= samples; i++) {
    const bounds = poseBounds(exportPose(duration * i / samples, config), editorCanvas.width, editorCanvas.height);
    minX = Math.min(minX, bounds.minX); minY = Math.min(minY, bounds.minY); maxX = Math.max(maxX, bounds.maxX); maxY = Math.max(maxY, bounds.maxY);
  }
  const hasDecorations = Object.values(config.decorative).some((effect) => effect.enabled);
  const padding = Math.max(3, Math.max(editorCanvas.width, editorCanvas.height) * (hasDecorations ? .42 : .02));
  minX -= padding; minY -= padding; maxX += padding; maxY += padding;
  const naturalWidth = maxX - minX, naturalHeight = maxY - minY, naturalMax = Math.max(naturalWidth, naturalHeight);
  const originalLimit = format === "gif" ? 1024 : 1920;
  const target = requestedSize === "original" ? Math.min(naturalMax, originalLimit) : Number(requestedSize);
  const scale = target / naturalMax;
  return { width: Math.max(2, Math.round(naturalWidth * scale)), height: Math.max(2, Math.round(naturalHeight * scale)), scale, minX, minY, capped: requestedSize === "original" && naturalMax > originalLimit };
}
function renderExportFrame(context, source, deformationCanvas, deformationContext, time, config, layout, background) {
  context.clearRect(0, 0, layout.width, layout.height);
  if (background !== "transparent") { context.fillStyle = background; context.fillRect(0, 0, layout.width, layout.height); }
  drawDeformedFrame(deformationContext, source, source.width, source.height, time, config);
  const frameSource = deformationCanvas, pose = exportPose(time, config), centerX = source.width / 2, centerY = source.height / 2;
  context.save(); context.scale(layout.scale, layout.scale); context.translate(-layout.minX, -layout.minY);
  const metrics = { cx: centerX + pose.x, cy: centerY + pose.y, width: source.width, height: source.height, rotation: pose.rotation, scaleX: pose.scaleX, scaleY: pose.scaleY };
  drawDecorativeLayer(context, "behind", time, config.decorative, metrics, frameSource);
  context.translate(centerX + pose.x, centerY + pose.y); context.rotate(pose.rotation); context.scale(pose.scaleX, pose.scaleY);
  context.drawImage(frameSource, -centerX, -centerY); context.restore();
  context.save(); context.scale(layout.scale, layout.scale); context.translate(-layout.minX, -layout.minY);
  drawDecorativeLayer(context, "front", time, config.decorative, metrics, frameSource); context.restore();
}
function nextPaint() { return new Promise((resolve) => requestAnimationFrame(resolve)); }
function verifyGifFrame(frame, width, height) {
  if (frame.width !== width || frame.height !== height || frame.data.length !== width * height * 4) throw new Error("Captured GIF frame dimensions do not match the export canvas.");
  const diagnostic = document.createElement("canvas"); diagnostic.width = width; diagnostic.height = height;
  const diagnosticContext = diagnostic.getContext("2d", { willReadFrequently: true }); diagnosticContext.putImageData(frame, 0, 0);
  const copy = diagnosticContext.getImageData(0, 0, width, height).data;
  for (let i = 0; i < frame.data.length; i += 4) {
    if (copy[i] !== frame.data[i] || copy[i + 1] !== frame.data[i + 1] || copy[i + 2] !== frame.data[i + 2] || copy[i + 3] !== frame.data[i + 3]) throw new Error("GIF diagnostic canvas did not preserve the captured RGBA frame.");
  }
}
async function createGif(canvas, context, source, talkCanvas, talkContext, config, layout, fps, duration, looping, background) {
  const frames = Math.max(1, Math.ceil(duration * fps));
  const encoder = new GifEncoder(layout.width, layout.height, { fps, loop: looping, transparent: background === "transparent" });
  for (let frame = 0; frame < frames; frame++) {
    renderExportFrame(context, source, talkCanvas, talkContext, frame / fps, config, layout, background);
    const captured = context.getImageData(0, 0, layout.width, layout.height);
    if (frame === 0) verifyGifFrame(captured, layout.width, layout.height);
    encoder.addFrame(captured);
    exportStatus.textContent = `Rendering ${Math.round((frame + 1) / frames * 100)}%`;
    if (frame % 2 === 1) await nextPaint();
  }
  return encoder.finish();
}
async function inspectGifBlob(blob, frameCountRequested) {
  const headerBytes = new Uint8Array(await blob.slice(0, 6).arrayBuffer());
  const header = new TextDecoder("ascii").decode(headerBytes);
  console.log("GIF blob type:", blob.type);
  console.log("GIF blob size:", blob.size);
  console.log("GIF header:", header);
  console.log("GIF frame count requested:", frameCountRequested);
  if (blob.type !== "image/gif" || (header !== "GIF87a" && header !== "GIF89a")) {
    throw new Error("GIF encoding failed");
  }
  return header;
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
async function createWebM(canvas, context, source, talkCanvas, talkContext, config, layout, fps, duration, looping, background) {
  if (!window.MediaRecorder || !canvas.captureStream) throw new Error("WebM export is not supported by this browser.");
  const vp9 = "video/webm;codecs=vp9", vp8 = "video/webm;codecs=vp8";
  const mimeType = MediaRecorder.isTypeSupported(vp9) ? vp9 : MediaRecorder.isTypeSupported(vp8) ? vp8 : "video/webm";
  if (background === "transparent" && mimeType !== vp9) throw new Error("Transparent WebM is unavailable because this browser does not report VP9 support. Choose a solid background or GIF.");
  const stream = canvas.captureStream(fps), chunks = [], recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise((resolve, reject) => { recorder.onstop = resolve; recorder.onerror = () => reject(new Error("The browser could not encode this WebM.")); });
  renderExportFrame(context, source, talkCanvas, talkContext, 0, config, layout, background); recorder.start(250);
  const started = performance.now();
  while (true) {
    const elapsed = (performance.now() - started) / 1000;
    if (elapsed >= duration) break;
    renderExportFrame(context, source, talkCanvas, talkContext, elapsed, config, layout, background);
    exportStatus.textContent = `Rendering ${Math.min(99, Math.round(elapsed / duration * 100))}%`;
    await nextPaint();
  }
  recorder.stop(); await stopped; stream.getTracks().forEach((track) => track.stop());
  return new Blob(chunks, { type: mimeType });
}
async function exportAnimation() {
  if (!original || exporting) return;
  const format = $("#export-format").value, config = captureAnimationConfig();
  if (config.effects.talk && !config.mouth) { exportStatus.textContent = "Select a mouth area before exporting Talk."; return; }
  if (config.effects.blink && !config.eyes) { exportStatus.textContent = "Select an eye area before exporting Blink."; return; }
  const fps = Number($("#export-fps").value), durationChoice = $("#export-duration").value;
  const duration = durationChoice === "custom" ? Number($("#custom-duration").value) : Number(durationChoice);
  if (!Number.isFinite(duration) || duration < .5 || duration > 10) { exportStatus.textContent = "Choose a duration from 0.5 to 10 seconds."; return; }
  const looping = $("#export-loop").checked, background = $("#export-background").value === "transparent" ? "transparent" : $("#export-color").value;
  const layout = prepareExport(config, format, $("#export-size").value, duration, fps);
  const canvas = document.createElement("canvas"); canvas.width = layout.width; canvas.height = layout.height;
  const context = canvas.getContext("2d", { alpha: background === "transparent", willReadFrequently: format === "gif" });
  const source = document.createElement("canvas"); source.width = editorCanvas.width; source.height = editorCanvas.height; source.getContext("2d").drawImage(editorCanvas, 0, 0);
  const talkCanvas = document.createElement("canvas"); talkCanvas.width = source.width; talkCanvas.height = source.height; const talkContext = talkCanvas.getContext("2d");
  exporting = true; createAnimationButton.disabled = true; downloadAnimation.hidden = true; downloadAnimation.removeAttribute("href");
  if (exportUrl) { URL.revokeObjectURL(exportUrl); exportUrl = null; }
  exportStatus.textContent = layout.capped ? `Original capped at ${format === "gif" ? "1024" : "1920"} px for memory safety. Rendering 0%` : "Rendering 0%";
  try {
    const blob = format === "gif"
      ? await createGif(canvas, context, source, talkCanvas, talkContext, config, layout, fps, duration, looping, background)
      : await createWebM(canvas, context, source, talkCanvas, talkContext, config, layout, fps, duration, looping, background);
    if (format === "gif") await inspectGifBlob(blob, Math.max(1, Math.ceil(duration * fps)));
    exportUrl = URL.createObjectURL(blob); downloadAnimation.href = exportUrl;
    downloadAnimation.download = `inky-paws-${config.baseMotion}.${format}`; downloadAnimation.textContent = `Download ${format.toUpperCase()}`; downloadAnimation.hidden = false;
    const alphaNote = format === "webm" && background === "transparent" ? " VP9 transparency depends on browser and video-player support." : "";
    const loopNote = format === "webm" && looping ? " WebM playback looping is controlled by the video player." : "";
    exportStatus.textContent = format === "gif"
      ? `GIF created · Frames: ${Math.max(1, Math.ceil(duration * fps))} · Duration: ${duration.toFixed(1)} s · FPS: ${fps} · File size: ${formatFileSize(blob.size)}`
      : `Animation ready · ${layout.width} × ${layout.height}.${alphaNote}${loopNote}`;
  } catch (error) { exportStatus.textContent = error.message; }
  finally { exporting = false; createAnimationButton.disabled = !original; }
}
function clearExportDownload() {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = null; downloadAnimation.hidden = true; downloadAnimation.removeAttribute("href");
}

function resetWorkspace() {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = null; imageInput.value = ""; editorCanvas.width = editorCanvas.height = characterImage.width = characterImage.height = 0;
  characterImage.hidden = true; emptyState.hidden = false; editorPlaceholder.hidden = false; uploadStatus.textContent = "No image selected";
  original = null; history = []; historyBytes = 0; erasing = drawing = autoApplied = false; mouthArea = eyeArea = null; selectingMouth = selectingEyes = false;
  eraseButton.classList.remove("active"); eraseButton.setAttribute("aria-pressed", "false"); editorCanvas.classList.remove("erasing");
  editorHelp.textContent = "Everything is processed locally in your browser.";
  clearExportDownload(); exportStatus.textContent = "Upload a character to export its animation.";
  mouthSelection.hidden = eyeSelection.hidden = true; resetMouthButton.disabled = previewTalkButton.disabled = resetEyesButton.disabled = playWalkButton.disabled = createAnimationButton.disabled = true; enableEditor(false);
  document.querySelectorAll("[data-effect-toggle]").forEach((input) => { input.checked = false; });
  document.querySelectorAll("[data-decorative-toggle]").forEach((input) => { input.checked = false; });
  document.querySelectorAll("[data-decorative-settings]").forEach((panel) => { panel.hidden = true; });
  [effectsBehind, effectsFront].forEach((canvas) => { canvas.hidden = true; canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); });
  $("input[name=\"base-motion\"][value=\"walk\"]").checked = true;
  document.querySelectorAll("[data-effect-settings]").forEach((panel) => { panel.hidden = true; });
  talkOpened = false; resetTalkSettings(); selectBaseMotion("walk"); updateControls();
}

imageInput.addEventListener("change", () => loadImage(imageInput.files[0]));
["dragenter", "dragover"].forEach((n) => dropZone.addEventListener(n, (e) => { e.preventDefault(); dropZone.classList.add("dragging"); }));
["dragleave", "drop"].forEach((n) => dropZone.addEventListener(n, (e) => { e.preventDefault(); dropZone.classList.remove("dragging"); }));
dropZone.addEventListener("drop", (e) => loadImage(e.dataTransfer.files[0]));
removeButton.addEventListener("click", () => removeBackground());
tolerance.addEventListener("input", () => { toleranceValue.value = tolerance.value; fillRange(tolerance); if (autoApplied) removeBackground(false); });
brush.addEventListener("input", () => { brushValue.value = `${brush.value} px`; fillRange(brush); });
eraseButton.addEventListener("click", () => {
  erasing = !erasing; eraseButton.classList.toggle("active", erasing); eraseButton.setAttribute("aria-pressed", erasing); editorCanvas.classList.toggle("erasing", erasing);
  editorHelp.textContent = erasing ? "Drag over the image to erase. Touch is supported." : "Erase tool turned off.";
});
editorCanvas.addEventListener("pointerdown", (e) => { if (!erasing || !original) return; e.preventDefault(); snapshot(); autoApplied = false; drawing = true; editorCanvas.setPointerCapture(e.pointerId); eraseAt(e); });
editorCanvas.addEventListener("pointermove", (e) => { if (drawing) eraseAt(e); });
["pointerup", "pointercancel"].forEach((n) => editorCanvas.addEventListener(n, () => { drawing = false; }));
undoButton.addEventListener("click", () => { const state = history.pop(); if (state) { historyBytes -= state.data.byteLength; edit.putImageData(state, 0, 0); syncPreview(); } autoApplied = false; undoButton.disabled = !history.length; });
restoreButton.addEventListener("click", () => { if (original) { snapshot(); edit.putImageData(original, 0, 0); autoApplied = false; syncPreview(); editorHelp.textContent = "Original image restored."; } });
document.querySelectorAll('input[name="base-motion"]').forEach((input) => input.addEventListener("change", () => selectBaseMotion(input.value)));
document.querySelectorAll("[data-effect-toggle]").forEach((input) => input.addEventListener("change", () => {
  const effect = input.dataset.effectToggle;
  if (effect === "talk" && input.checked && !talkOpened) { resetTalkSettings(); talkOpened = true; }
  $(`[data-effect-settings="${effect}"]`).hidden = !input.checked;
  if (!input.checked && effect === "talk") selectingMouth = false;
  if (!input.checked && effect === "blink") selectingEyes = false;
  if (!selectingMouth && !selectingEyes) { stage.classList.remove("selecting-mouth"); setMouthButton.classList.remove("active"); setEyesButton.classList.remove("active"); }
  if (original) playing = true;
  animationStart = performance.now(); resetPreviewPose(); updateMouthOverlay(); updateEyeOverlay(); updateStatus();
}));
document.querySelectorAll(".setting-range input").forEach((input) => input.addEventListener("input", updateControls));
document.querySelectorAll('input[name="walk-style"]').forEach((input) => input.addEventListener("change", () => selectWalkStyle(input.value)));
document.querySelectorAll("[data-walk-direction]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-walk-direction]").forEach((choice) => { const active = choice === button; choice.classList.toggle("active", active); choice.setAttribute("aria-pressed", active); });
  resetPreviewPose(); animationStart = performance.now();
}));
playWalkButton.addEventListener("click", () => {
  if (!original) return;
  playing = !playing; animationStart = performance.now();
  if (!playing) resetPreviewPose(); updateWalkButton(); updateStatus();
});
document.querySelectorAll('input[name="talk-style"]').forEach((input) => input.addEventListener("change", () => { if (mouthArea && !playing) renderTalk(0); }));
$("#export-duration").addEventListener("change", () => { $("#custom-duration-field").hidden = $("#export-duration").value !== "custom"; });
$("#export-background").addEventListener("change", () => { $("#export-color-field").hidden = $("#export-background").value !== "solid"; });
createAnimationButton.addEventListener("click", exportAnimation);
setMouthButton.addEventListener("click", () => {
  if (!original) { selectionHelp.textContent = "Upload a character before selecting its mouth."; return; }
  playing = false; resetPreviewPose(); selectingMouth = true; selectingEyes = false; selectionStart = null; mouthSelection.hidden = true; eyeSelection.hidden = true; setEyesButton.classList.remove("active");
  stage.classList.add("selecting-mouth"); setMouthButton.classList.add("active");
  selectionHelp.textContent = "Drag a rectangle around the mouth on the character."; updateStatus();
});
stage.addEventListener("pointerdown", (event) => {
  if ((!selectingMouth && !selectingEyes) || !original) return;
  const rect = characterImage.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
  event.preventDefault(); selectionStart = mouthPoint(event); stage.setPointerCapture(event.pointerId);
});
stage.addEventListener("pointermove", (event) => {
  if ((!selectingMouth && !selectingEyes) || !selectionStart) return;
  event.preventDefault(); const point = mouthPoint(event);
  const draft = { x: Math.min(selectionStart.x, point.x), y: Math.min(selectionStart.y, point.y), width: Math.abs(point.x - selectionStart.x), height: Math.abs(point.y - selectionStart.y) };
  if (selectingMouth) updateMouthOverlay(draft); else updateEyeOverlay(draft);
});
stage.addEventListener("pointerup", (event) => {
  if ((!selectingMouth && !selectingEyes) || !selectionStart) return;
  const point = mouthPoint(event), area = { x: Math.min(selectionStart.x, point.x), y: Math.min(selectionStart.y, point.y), width: Math.abs(point.x - selectionStart.x), height: Math.abs(point.y - selectionStart.y) };
  selectionStart = null;
  if (area.width < 3 || area.height < 3) {
    if (selectingMouth) { mouthSelection.hidden = true; selectionHelp.textContent = "Drag a larger rectangle around the mouth."; }
    else { eyeSelection.hidden = true; eyeSelectionHelp.textContent = "Drag a larger rectangle around the eyes."; }
    return;
  }
  if (selectingMouth) {
    mouthArea = area; selectingMouth = false; setMouthButton.classList.remove("active"); resetMouthButton.disabled = previewTalkButton.disabled = false;
    updateMouthOverlay(); selectionHelp.textContent = "Mouth area saved in original image coordinates.";
  } else {
    eyeArea = area; selectingEyes = false; setEyesButton.classList.remove("active"); resetEyesButton.disabled = false;
    updateEyeOverlay(); eyeSelectionHelp.textContent = "Eye area saved in original image coordinates.";
  }
  playing = true; animationStart = performance.now(); stage.classList.remove("selecting-mouth"); updateStatus();
});
stage.addEventListener("pointercancel", () => { selectionStart = null; selectingMouth = selectingEyes = false; stage.classList.remove("selecting-mouth"); setMouthButton.classList.remove("active"); setEyesButton.classList.remove("active"); });
resetMouthButton.addEventListener("click", () => {
  mouthArea = null; resetPreviewPose(); mouthSelection.hidden = true; previewTalkButton.disabled = resetMouthButton.disabled = true; selectionHelp.textContent = "Mouth area reset. Select it again when ready.";
});
setEyesButton.addEventListener("click", () => {
  if (!original) { eyeSelectionHelp.textContent = "Upload a character before selecting its eyes."; return; }
  playing = false; resetPreviewPose(); selectingEyes = true; selectingMouth = false; selectionStart = null; eyeSelection.hidden = true; mouthSelection.hidden = true; setMouthButton.classList.remove("active");
  stage.classList.add("selecting-mouth"); setEyesButton.classList.add("active"); eyeSelectionHelp.textContent = "Drag a rectangle around the eyes on the character."; updateStatus();
});
resetEyesButton.addEventListener("click", () => { eyeArea = null; resetPreviewPose(); eyeSelection.hidden = true; resetEyesButton.disabled = true; eyeSelectionHelp.textContent = "Eye area reset. Select it again when ready."; });
previewTalkButton.addEventListener("click", () => {
  if (!mouthArea) return;
  playing = !playing; animationStart = performance.now(); previewTalkButton.textContent = playing ? "Pause Talk" : "Preview Talk";
  if (!playing) renderTalk(0); updateStatus();
});
window.addEventListener("resize", () => { updateMouthOverlay(); updateEyeOverlay(); });
resetButton.addEventListener("click", resetWorkspace); window.addEventListener("beforeunload", () => { if (imageUrl) URL.revokeObjectURL(imageUrl); if (exportUrl) URL.revokeObjectURL(exportUrl); });
createDecorativeControls(); updateControls(); selectBaseMotion("walk"); requestAnimationFrame(animate);
