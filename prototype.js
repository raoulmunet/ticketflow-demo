/* DEMO ONLY. DOM adapter for local, synthetic, in-memory interactions. */
(function () {
  "use strict";
  const api = window.TicketFlowDemo;
  const demo = api.createDemo();
  const $ = id => document.getElementById(id);
  let role = "requester";
  const labels = { requester: "Requester view · fictional owned tickets", agent: "Agent view · fictional assigned tickets", manager: "Manager view · all synthetic tickets" };
  const title = value => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function badge(value, kind) { return node("span", title(value), `pill ${kind}-${value.toLowerCase()}`); }
  function detailLink(ticket, text) { const link = node("a", text || ticket.subject); link.href = `#ticket-details/${ticket.ref}`; return link; }
  function deadline(value) { return new Date(value).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC"; }
  function announce(text) { $("announcement").textContent = text; }
  // Presentation-only tour: no model mutations or simulated role changes.
  const tour = { active: false, index: 0, target: null, route: null, pending: false, focus: null };
  const tourSteps = [
    ["Demo, not production", ".notice", "Use fictional text only. Never enter confidential or personal information. Changes live only in memory; this is not real authentication."],
    ["Three perspectives", "#view-role", "Requester, Agent and Manager are simulated views. This tour keeps your current role and never grants access."],
    ["Your dashboard", "#metrics", "These indicators describe only the tickets visible in your current simulated view.", "dashboard"],
    ["Find a ticket", "#my-tickets .filters", "Search and filter fictional tickets. Your existing filters are preserved throughout the tour.", "my-tickets"],
    ["Create safely", "#create-form", "Only Requester can simulate creation. Use fictional content; the tour never fills or submits this form.", "create-ticket"],
    ["Ticket context", "#detail-content .detail-meta", "This existing ticket comes from your current visible queue. No hidden ticket is opened.", "details"],
    ["Discussion and history", "#detail-content .history", "Public discussion and history follow the current simulated role. Internal notes are excluded from Requester projections. All shipped fixtures are public examples.", "details"],
    ["Available actions", "#detail-content .two-column > aside.card", "Actions depend on role and status; closed and cancelled tickets are read-only. Nothing is executed by the tour. Finish to explore; reset or reload discards changes.", "details"]
  ];
  function hasDrafts() {
    return [...document.querySelectorAll("#create-form, #detail-content form")].some(form => [...form.elements].some(control => {
      if (control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement) return control.value !== control.defaultValue;
      if (control instanceof HTMLSelectElement) {
        const original = [...control.options].find(option => option.defaultSelected) || control.options[0];
        return control.value !== original?.value;
      }
      return false;
    }));
  }
  function stopTour(message) {
    if (!tour.active) return;
    tour.active = false; tour.pending = false;
    tour.target?.classList.remove("tour-target"); tour.target = null;
    if ($("guided-tour").open) $("guided-tour").close();
    const focus = tour.focus?.isConnected ? tour.focus : $("take-tour"); focus.focus();
    if (message) announce(message);
  }
  function showTourStep() {
    if (!tour.active) return;
    const [heading, selector, copy] = tourSteps[tour.index]; const target = document.querySelector(selector);
    if (!target?.isConnected || !target.getClientRects().length) { stopTour("Tour stopped: this target is unavailable in the current simulated view."); return; }
    tour.target?.classList.remove("tour-target"); tour.target = target; target.classList.add("tour-target");
    $("tour-counter").textContent = `Step ${tour.index + 1} of ${tourSteps.length}`;
    $("tour-title").textContent = heading; $("tour-copy").textContent = copy;
    $("tour-back").disabled = tour.index === 0;
    $("tour-next").textContent = tour.index === tourSteps.length - 1 ? "Finish" : "Next";
    target.scrollIntoView({ block: "start", behavior: "instant" });
    if (!$("guided-tour").open) $("guided-tour").showModal();
    $("tour-title").focus({ preventScroll: true });
  }
  function moveTour(index) {
    if (!tour.active || tour.pending) return;
    tour.index = index;
    const page = tourSteps[index][3]; let route = page ? `#${page}` : window.location.hash;
    if (page === "details") {
      const ticket = demo.list(role)[0];
      if (!ticket) { stopTour("Tour stopped: no ticket is visible in this simulated view."); return; }
      route = `#ticket-details/${ticket.ref}`;
    }
    tour.route = route;
    if (route !== window.location.hash) { tour.pending = true; window.location.hash = route; }
    else showTourStep();
  }
  $("take-tour").addEventListener("click", () => {
    if (tour.active) return;
    if (hasDrafts()) { announce("Tour not started: finish or manually discard unsaved form changes first. Nothing was discarded."); return; }
    tour.active = true; tour.focus = $("take-tour"); moveTour(0);
  });
  $("tour-back").addEventListener("click", () => { if (tour.index > 0) moveTour(tour.index - 1); });
  $("tour-next").addEventListener("click", () => {
    if (tour.index === tourSteps.length - 1) stopTour("Tour finished. Explore with fictional data only."); else moveTour(tour.index + 1);
  });
  $("tour-skip").addEventListener("click", () => stopTour("Tour skipped. You can restart with Take a Tour."));
  $("guided-tour").addEventListener("cancel", event => { event.preventDefault(); stopTour("Tour closed."); });
  $("view-role").addEventListener("change", () => stopTour("Tour closed because the simulated role changed."));
  $("reset-demo").addEventListener("click", () => stopTour("Tour closed because fixtures were reset."));
  new MutationObserver(() => {
    if (tour.active && !tour.pending && tour.target && (!tour.target.isConnected || !tour.target.getClientRects().length)) stopTour("Tour stopped: the highlighted target changed.");
  }).observe($("main"), { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  function isCurrent(form, context) {
    const route = window.location.hash || "#dashboard";
    return form.isConnected && !$("ticket-details").hidden && (route === "#ticket-details" || route === `#ticket-details/${context.ref}`)
      && $("view-role").value === context.role && role === context.role;
  }
  function discardDetailsDrafts() { document.querySelectorAll("#detail-content form").forEach(form => form.reset()); }
  function handleAction(form, context, action) {
    const error = node("p", undefined, "error"); error.hidden = true; error.setAttribute("role", "alert"); error.tabIndex = -1; form.append(error);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const result = action(isCurrent(form, context) ? context : null);
      if (result.error) { error.textContent = result.error; error.hidden = false; if (form.isConnected) error.focus(); return; }
      render(true); announce("DEMO ONLY: fictional workflow updated in memory.");
    });
  }
  function renderDashboard() {
    const values = demo.metrics(role); $("metrics").replaceChildren();
    [["Open tickets", values.open, "New through in progress", ""], ["Overdue", values.overdue, "Against the fixed demo clock", "overdue"], ["Awaiting confirmation", values.awaiting, "Resolved synthetic requests", ""]].forEach(([label, value, hint, style]) => {
      const card = node("article", undefined, `metric ${style}`); card.append(node("span", label), node("strong", String(value)), node("small", hint)); $("metrics").append(card);
    });
    const visible = demo.list(role); $("status-chart").replaceChildren();
    api.statuses.filter(status => visible.some(t => t.status === status)).forEach(status => {
      const count = visible.filter(t => t.status === status).length; const row = node("div", undefined, "bar-row");
      const bar = node("div", undefined, "bar"); bar.setAttribute("aria-hidden", "true"); const fill = node("div", undefined, "bar-fill");
      fill.dataset.width = String(Math.min(5, Math.ceil(count / visible.length * 5))); bar.append(fill);
      row.append(node("span", title(status)), bar, node("strong", String(count))); $("status-chart").append(row);
    });
    $("recent-tickets").replaceChildren(); visible.slice(0, 3).forEach(ticket => {
      const card = node("article", undefined, "ticket-card"); card.append(node("span", ticket.ref, "small muted"), detailLink(ticket), badge(ticket.status, "status"), node("p", `Resolution due ${deadline(ticket.due)}`)); $("recent-tickets").append(card);
    });
  }
  function renderList() {
    const tickets = demo.list(role, { search: $("search").value, status: $("status-filter").value, priority: $("priority-filter").value }); $("ticket-rows").replaceChildren();
    tickets.forEach(ticket => {
      const row = node("tr"); const subject = node("td"); subject.append(node("small", ticket.ref), detailLink(ticket));
      const priority = node("td"); priority.append(badge(ticket.priority, "priority")); const status = node("td"); status.append(badge(ticket.status, "status"));
      const action = node("td"); action.append(detailLink(ticket, "Open →")); action.firstChild.setAttribute("aria-label", `Open ${ticket.ref} — demo only`);
      row.append(subject, priority, status, node("td", deadline(ticket.due)), action); $("ticket-rows").append(row);
    });
    $("result-count").textContent = `${tickets.length} matching synthetic ticket${tickets.length === 1 ? "" : "s"} · DEMO ONLY`; $("empty-state").hidden = tickets.length > 0;
  }
  function renderDetail(ref) {
    demo.activate(null, null);
    discardDetailsDrafts();
    const ticket = ref ? demo.detail(role, ref) : demo.list(role)[0]; const container = $("detail-content"); container.replaceChildren();
    if (!ticket) {
      const state = node("div", undefined, "empty card"); state.append(node("h2", "Ticket unavailable in this simulated view"), node("p", "The fixture may not exist or may be outside this role's example scope. No live authorization was checked."));
      const link = node("a", "Back to My Tickets"); link.href = "#my-tickets"; state.append(link); container.append(state); return;
    }
    const meta = node("div", undefined, "detail-meta"); meta.append(node("span", ticket.ref, "pill"), badge(ticket.status, "status"), badge(ticket.priority, "priority"), node("span", "DEMO ONLY", "pill demo-pill"));
    const columns = node("div", undefined, "two-column"); const content = node("article", undefined, "card"); content.append(node("h2", ticket.subject), node("p", ticket.description, "detail-description"), node("h3", "Discussion"));
    content.append(node("p", role !== "requester" ? "Simulation: public comments and internal notes are shown for this assigned Agent / Manager view." : "Simulation: internal notes are excluded from this Requester view and displayed discussion counts.", "small muted"));
    if (ticket.resolution) content.append(node("h3", "Current fictional resolution"), node("p", ticket.resolution, "detail-description"));
    content.append(node("p", `${ticket.comments.length} visible demo discussion entries`, "small"));
    if (!ticket.comments.length) content.append(node("p", "No discussion yet. This new ticket exists only in memory.", "empty"));
    ticket.comments.forEach(comment => { const entry = node("div", undefined, `comment${comment.internal ? " internal" : ""}`); entry.append(node("span", comment.internal ? "INTERNAL NOTE · SYNTHETIC" : "PUBLIC COMMENT · SYNTHETIC", "pill"), node("p", comment.text)); content.append(entry); });
    content.append(node("h3", "Synthetic history"), node("p", `${ticket.history.length} visible demo history events`, "small history-count"));
    const history = node("ul", undefined, "history");
    ticket.history.forEach(event => { const item = node("li"); item.append(node("p", event.text), node("small", `${event.author} · ${deadline(event.at)}`)); history.append(item); });
    content.append(history);
    const context = demo.activate(role, ticket.ref);
    if (context) {
      const form = node("form", undefined, "discussion-form"); form.id = "discussion-form";
      const textLabel = node("label", "Fictional comment · 1–2,000 characters");
      const text = node("textarea"); text.name = "comment"; text.rows = 4; text.maxLength = 2000; text.required = true; textLabel.append(text);
      const visibilityLabel = node("label", "Visibility · simulation only"); const visibility = node("select"); visibility.name = "visibility";
      (role === "requester" ? ["public"] : ["public", "internal"]).forEach(value => { const option = node("option", value === "public" ? "Public comment" : "Internal note"); option.value = value; visibility.append(option); }); visibilityLabel.append(visibility);
      const error = node("p", undefined, "error"); error.hidden = true; error.setAttribute("role", "alert"); error.tabIndex = -1;
      const submit = node("button", "Add fictional comment · Demo only", "button primary"); submit.type = "submit";
      form.append(textLabel, visibilityLabel, error, submit, node("p", "Fictional content only. Unsaved drafts are discarded on navigation, view change, reset or reload.", "small muted"));
      form.addEventListener("submit", event => {
        event.preventDefault();
        // Check actual controls/route too: programmatic changes may precede events.
        const current = isCurrent(form, context);
        const result = demo.addComment(current ? context : null, { text: text.value, visibility: visibility.value, role, ref: ticket.ref, actor: context.actor });
        if (result.error) { error.textContent = result.error; error.hidden = false; if (form.isConnected) error.focus(); return; }
        render(true); announce("DEMO ONLY: fictional comment added in memory.");
      });
      content.append(form);
    } else content.append(node("p", "DEMO ONLY: discussion is read-only on closed or cancelled tickets.", "small muted"));
    const info = node("aside", undefined, "card"); info.append(node("h2", "Request context")); const list = node("dl");
    [["Category", ticket.category], ["Resolution deadline", deadline(ticket.due)], ["Requester", ticket.requester === "demo-requester" ? "Fictional Requester A" : "Fictional Requester B"], ["Assignment", ticket.agent ? (ticket.agent === "demo-agent" ? "Fictional Agent A" : "Fictional Agent B") : "Unassigned"]].forEach(([label, value]) => list.append(node("dt", label), node("dd", value)));
    info.append(list, node("h3", "Workflow actions · Demo only"), node("p", "In-memory simulation, not real authorization. No backend call is made.", "small muted"));
    const actions = demo.actions(role, ticket.ref);
    const targets = actions.transitions.filter(target => target !== "ASSIGNED");
    if (context && targets.length) {
      const form = node("form", undefined, "workflow-form"); form.id = "workflow-form";
      const label = node("label", "Simulated status action"); const target = node("select"); target.name = "target";
      targets.forEach(value => { const option = node("option", title(value)); option.value = value; target.append(option); }); label.append(target);
      const summaryLabel = node("label", "Fictional resolution · required to resolve, max 2,000 UTF-16 units"); const summary = node("textarea"); summary.name = "resolution"; summary.maxLength = 2000; summary.rows = 4; summaryLabel.append(summary);
      summaryLabel.hidden = !targets.includes("RESOLVED"); summary.disabled = summaryLabel.hidden; summary.required = !summaryLabel.hidden;
      const submit = node("button", "Apply status · Demo only", "button primary"); submit.type = "submit";
      form.append(label, summaryLabel, submit);
      handleAction(form, context, current => demo.transition(current, { ...context, target: target.value, resolution: summary.value })); info.append(form);
    }
    if (context && actions.assignments.length) {
      const form = node("form", undefined, "workflow-form"); form.id = "assignment-form";
      const label = node("label", ticket.status === "TRIAGED" ? "Initial fictional assignment" : "Fictional reassignment"); const choice = node("select"); choice.name = "assignment";
      actions.assignments.forEach((value, index) => { const option = node("option", value.label); option.value = String(index); choice.append(option); }); label.append(choice);
      const submit = node("button", "Assign · Demo only", "button primary"); submit.type = "submit"; form.append(label, submit);
      handleAction(form, context, current => { const selected = actions.assignments.find((_, index) => String(index) === choice.value);
        return demo.assign(current, { ...context, agent: selected?.agent, team: selected?.team }); }); info.append(form);
    }
    if (!targets.length && !actions.assignments.length) info.append(node("p", "No permitted workflow action in this simulated view.", "small muted"));
    const disabled = node("button", "Attachments / export · not implemented", "button secondary"); disabled.type = "button"; disabled.disabled = true; info.append(disabled); columns.append(content, info); container.append(meta, columns);
  }
  function render(focus) {
    if (tour.active && !tour.pending) stopTour("Tour closed because the application view changed.");
    const match = /^#(dashboard|my-tickets|create-ticket|ticket-details)(?:\/(DEMO-\d+))?$/.exec(window.location.hash || "#dashboard"); const page = match ? match[1] : "ticket-details"; const ref = match ? match[2] : "invalid";
    document.querySelectorAll(".page").forEach(section => { section.hidden = section.id !== page; });
    document.querySelectorAll("nav a").forEach(link => { if (link.getAttribute("href") === `#${page}`) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current"); });
    document.querySelectorAll(".scope").forEach(element => { element.textContent = `${labels[role]} · Client-side illustration only`; });
    renderDashboard(); renderList(); renderDetail(ref);
    $("create-guidance").textContent = role === "requester" ? "DEMO ONLY: created tickets belong to Fictional Requester A. Use fictional content only." : "DEMO ONLY: creation is simulated only for the Requester view. Switch the selector above to try it.";
    Array.from($("create-form").elements).forEach(element => { element.disabled = role !== "requester"; });
    if (focus) document.querySelector(`#${page} h1`).focus();
  }
  $("view-role").addEventListener("change", event => { role = event.target.value; $("create-form").reset(); $("create-error").hidden = true; render(false); announce(`DEMO ONLY: ${labels[role]}. All data and identity relationships are synthetic.`); });
  ["search", "status-filter", "priority-filter"].forEach(id => $(id).addEventListener(id === "search" ? "input" : "change", renderList));
  $("clear-filters").addEventListener("click", () => { ["search", "status-filter", "priority-filter"].forEach(id => { $(id).value = ""; }); renderList(); announce("Demo filters cleared."); });
  $("create-form").addEventListener("submit", event => {
    event.preventDefault(); const fields = $("create-form").elements;
    const result = demo.create(role, { subject: fields.namedItem("subject").value, description: fields.namedItem("description").value, category: fields.namedItem("category").value, priority: fields.namedItem("priority").value });
    $("create-error").hidden = !result.error;
    if (result.error) { $("create-error").textContent = result.error; $("create-error").tabIndex = -1; $("create-error").focus(); return; }
    $("create-form").reset(); announce(`DEMO ONLY: ${result.ticket.ref} created in memory. Reload or reset to discard it.`); window.location.hash = `ticket-details/${result.ticket.ref}`;
  });
  $("reset-demo").addEventListener("click", () => { demo.reset(); $("create-form").reset(); $("create-error").hidden = true; ["search", "status-filter", "priority-filter"].forEach(id => { $(id).value = ""; }); render(false); announce("DEMO ONLY: fixtures reset. All simulated creations discarded."); });
  window.addEventListener("hashchange", () => {
    const tourNavigation = tour.active && tour.pending && window.location.hash === tour.route;
    if (tour.active && !tourNavigation) stopTour("Tour closed because the route changed.");
    if (window.location.hash === "#main") { demo.activate(null, null); discardDetailsDrafts(); $("main").focus(); }
    else render(true);
    if (tourNavigation && tour.active) { tour.pending = false; showTourStep(); }
  }); render(false);
}());
