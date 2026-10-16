/* DEMO ONLY. Hand-authored synthetic fixtures; no real identities or backend. */
(function (root) {
  "use strict";
  const roles = ["requester", "agent", "manager"];
  const statuses = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"];
  const categories = ["Application", "Network", "Database", "Access & Identity"];
  const priorities = ["P1", "P2", "P3", "P4"];
  const clock = "2026-10-15T12:00:00Z";
  const open = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS"];
  const actors = Object.freeze({ requester: "Fictional Requester A", agent: "Fictional Agent A", manager: "Fictional Manager A" });
  const assignments = [
    { agent: "demo-agent", team: "demo-team-a", label: "Fictional Agent A / Team A", active: true },
    { agent: "demo-other-agent", team: "demo-team-b", label: "Fictional Agent B / Team B", active: true },
    { agent: "demo-inactive-agent", team: "demo-team-a", label: "Fictional inactive agent", active: false }
  ];
  const transitions = [
    ["NEW", "TRIAGED", "manager"], ["TRIAGED", "ASSIGNED", "manager"],
    ["ASSIGNED", "IN_PROGRESS", "agent"], ["IN_PROGRESS", "RESOLVED", "agent"],
    ["RESOLVED", "CLOSED", "requester"], ["RESOLVED", "IN_PROGRESS", "requester"],
    ["NEW", "CANCELLED", "requester"]
  ];
  function initialHistory(ticket) {
    const author = ticket.requester === "demo-requester" ? actors.requester : "Fictional Requester B";
    return [{ kind: "created", text: "Synthetic ticket created", author, at: clock, internal: false },
      ...(ticket.status === "NEW" ? [] : [{ kind: "status", text: `Synthetic status: ${ticket.status}`, author: actors.manager, at: clock, internal: false }])];
  }
  // Fictional relationships, never real user IDs or identity mappings.
  const fixtures = [
    { ref: "DEMO-101", subject: "Access to the fictional Atlas workspace", category: "Access & Identity", priority: "P3", status: "IN_PROGRESS", requester: "demo-requester", agent: "demo-agent", due: "2026-10-16T10:00:00Z" },
    { ref: "DEMO-102", subject: "Sample meeting-room network disconnects", category: "Network", priority: "P2", status: "ASSIGNED", requester: "demo-requester", agent: "demo-agent", due: "2026-10-15T10:00:00Z" },
    { ref: "DEMO-103", subject: "Example export needs confirmation", category: "Application", priority: "P4", status: "RESOLVED", requester: "demo-requester", agent: "demo-other-agent", due: "2026-10-17T12:00:00Z" },
    { ref: "DEMO-104", subject: "Synthetic database health check", category: "Database", priority: "P1", status: "TRIAGED", requester: "demo-other-requester", agent: null, due: "2026-10-15T13:00:00Z" },
    { ref: "DEMO-105", subject: "Fictional kiosk display adjustment", category: "Application", priority: "P3", status: "CANCELLED", requester: "demo-other-requester", agent: null, due: "2026-10-16T12:00:00Z" },
    { ref: "DEMO-106", subject: "Sample connection restored", category: "Network", priority: "P4", status: "CLOSED", requester: "demo-other-requester", agent: "demo-agent", due: "2026-10-14T12:00:00Z" }
  ].map(ticket => ({ ...ticket, description: "Synthetic fixture only. This fictional issue illustrates the Basic workflow and is not a real support request.", comments: [
    { internal: false, text: "Synthetic public update: the example request has been received." },
    { internal: true, text: "Synthetic internal note: investigate the fictional configuration before responding." }
  ], history: [...initialHistory(ticket),
    { kind: "comment", text: "Synthetic public comment added", author: actors.agent, at: clock, internal: false },
    { kind: "comment", text: "Synthetic internal note added", author: actors.agent, at: clock, internal: true }] }));
  function createDemo() {
    let tickets = JSON.parse(JSON.stringify(fixtures));
    function initialize(ticket) {
      ticket.team = ticket.agent === "demo-agent" ? "demo-team-a" : ticket.agent ? "demo-team-b" : null;
      ticket.resolution = ticket.status === "RESOLVED" ? "Synthetic fixture resolution awaiting confirmation." : null;
      return ticket;
    }
    tickets.forEach(initialize);
    let next = 107;
    let active = null;
    let snapshot = null;
    function canSee(ticket, role) {
      return roles.includes(role) && (role === "manager" || (role === "requester" ? ticket.requester === "demo-requester" : ticket.agent === "demo-agent"));
    }
    function project(ticket, role) {
      // Client-side illustration only: ALL fixtures are inspectable in source.
      const visible = item => !item.internal || role === "manager" || (role === "agent" && ticket.agent === "demo-agent");
      // No global IDs, sequence numbers, total counts or last-activity metadata.
      return { ...ticket, comments: ticket.comments.filter(visible).map(c => ({ ...c })),
        history: ticket.history.filter(visible).map(e => ({ ...e })) };
    }
    const rejected = () => ({ error: "DEMO ONLY: action rejected. Reopen the current ticket and check the fictional input." });
    function current(context, input) {
      if (!context || context !== active || !input || typeof input !== "object") return null;
      if (input.role !== active.role || input.ref !== active.ref || input.actor !== active.actor) return null;
      const ticket = tickets.find(t => t.ref === active.ref && canSee(t, active.role));
      if (!ticket || !roles.includes(active.role) || actors[active.role] !== active.actor || ["CLOSED", "CANCELLED"].includes(ticket.status)) return null;
      if (!snapshot || ticket.status !== snapshot.status || ticket.agent !== snapshot.agent || ticket.team !== snapshot.team) return null;
      return ticket;
    }
    function allowed(ticket, role, target) {
      return canSee(ticket, role) && transitions.some(([from, to, required]) => from === ticket.status && to === target && role === required);
    }
    function event(ticket, role, kind, text) {
      ticket.history.push({ kind, text, author: actors[role], at: clock, internal: false });
    }
    function assign(context, input, initialOnly = false) {
      const ticket = current(context, input);
      if (!ticket || context.role !== "manager" || !(initialOnly ? ticket.status === "TRIAGED" : ["TRIAGED", "ASSIGNED"].includes(ticket.status))) return rejected();
      const choice = assignments.find(a => a.active && a.agent === input.agent && a.team === input.team);
      if (!choice || (ticket.agent === choice.agent && ticket.team === choice.team)) return rejected();
      const initial = ticket.status === "TRIAGED";
      // All validation precedes mutation; incoming status/assignment snapshots
      // are never consulted. State belongs exclusively to this in-memory model.
      ticket.agent = choice.agent; ticket.team = choice.team; ticket.status = "ASSIGNED";
      if (initial) event(ticket, context.role, "status", "Synthetic status: ASSIGNED");
      event(ticket, context.role, "assignment", `Synthetic ${initial ? "assignment" : "reassignment"}: ${choice.label}`);
      active = null; snapshot = null;
      return { ticket: project(ticket, context.role) };
    }
    return {
      activate(role, ref) {
        active = null; snapshot = null;
        const ticket = tickets.find(t => t.ref === ref && canSee(t, role));
        if (!ticket || ["CLOSED", "CANCELLED"].includes(ticket.status)) return null;
        active = Object.freeze({ role, ref, actor: actors[role] });
        snapshot = { status: ticket.status, agent: ticket.agent, team: ticket.team };
        return active;
      },
      actions(role, ref) {
        const ticket = tickets.find(t => t.ref === ref && canSee(t, role));
        if (!ticket) return { transitions: [], assignments: [] };
        return { transitions: statuses.filter(target => allowed(ticket, role, target)),
          assignments: role === "manager" && ["TRIAGED", "ASSIGNED"].includes(ticket.status)
            ? assignments.filter(a => a.active && !(a.agent === ticket.agent && a.team === ticket.team)).map(({ agent, team, label }) => ({ agent, team, label })) : [] };
      },
      assign(context, input) { return assign(context, input); },
      transition(context, input) {
        const ticket = current(context, input);
        if (!ticket || !allowed(ticket, context.role, input.target)) return rejected();
        if (input.target === "ASSIGNED") return assign(context, input, true);
        if (input.target === "RESOLVED" && (typeof input.resolution !== "string" || !input.resolution.trim() || input.resolution.length > 2000)) return rejected();
        const reopening = ticket.status === "RESOLVED" && input.target === "IN_PROGRESS";
        if (input.target === "RESOLVED") ticket.resolution = input.resolution.trim();
        if (reopening) {
          event(ticket, context.role, "reopened", `Synthetic reopened ticket. Previous resolution: ${ticket.resolution || "No fixture resolution"}`);
          ticket.resolution = null;
        }
        ticket.status = input.target;
        event(ticket, context.role, "status", `Synthetic status: ${input.target}${input.target === "RESOLVED" ? ` — ${ticket.resolution}` : ""}`);
        active = null; snapshot = null;
        return { ticket: project(ticket, context.role) };
      },
      addComment(context, input) {
        const error = { error: "DEMO ONLY: comment rejected. Reopen the current ticket and check the fictional input." };
        const ticket = current(context, input);
        if (!ticket) return error;
        if (!["public", "internal"].includes(input.visibility) || (input.visibility === "internal" && active.role === "requester")) return error;
        if (typeof input.text !== "string" || !input.text.trim() || input.text.trim().length > 2000) return error;
        const internal = input.visibility === "internal";
        ticket.comments.push({ text: input.text.trim(), internal, author: active.actor, at: clock });
        ticket.history.push({ kind: "comment", text: internal ? "Synthetic internal note added" : "Synthetic public comment added", internal, author: active.actor, at: clock });
        active = null; snapshot = null; // Successful forms are single-use.
        return { ticket: project(ticket, context.role) };
      },
      list(role, filter = {}) {
        const search = String(filter.search || "").trim().toLowerCase();
        return tickets.filter(t => canSee(t, role)).filter(t => !filter.status || t.status === filter.status)
          .filter(t => !filter.priority || t.priority === filter.priority)
          .filter(t => `${t.ref} ${t.subject}`.toLowerCase().includes(search)).map(t => project(t, role));
      },
      detail(role, ref) { const ticket = tickets.find(t => t.ref === ref && canSee(t, role)); return ticket ? project(ticket, role) : null; },
      metrics(role) {
        const visible = this.list(role);
        return { open: visible.filter(t => open.includes(t.status)).length,
          overdue: visible.filter(t => open.includes(t.status) && Date.parse(t.due) < Date.parse(clock)).length,
          awaiting: visible.filter(t => t.status === "RESOLVED").length };
      },
      create(role, input) {
        if (role !== "requester") return { error: "DEMO ONLY: switch to the Requester view to simulate creation." };
        const subject = String(input.subject || "").trim();
        const description = String(input.description || "").trim();
        if (!subject || subject.length > 250) return { error: "DEMO ONLY: enter a subject of 1–250 characters." };
        if (!description || description.length > 2000) return { error: "DEMO ONLY: enter a description of 1–2,000 characters." };
        if (!categories.includes(input.category) || !priorities.includes(input.priority)) return { error: "DEMO ONLY: choose a listed category and priority." };
        const hours = { P1: 4, P2: 8, P3: 24, P4: 72 }[input.priority];
        const ticket = { ref: `DEMO-${next++}`, subject, description, category: input.category, priority: input.priority, status: "NEW", requester: "demo-requester", agent: null, due: new Date(Date.parse(clock) + hours * 3600000).toISOString(), comments: [] };
        ticket.history = initialHistory(ticket);
        initialize(ticket);
        active = null; snapshot = null;
        tickets.unshift(ticket); return { ticket: project(ticket, role) };
      },
      reset() { active = null; snapshot = null; tickets = JSON.parse(JSON.stringify(fixtures)).map(initialize); next = 107; }
    };
  }
  const api = Object.freeze({ createDemo, roles, statuses, clock });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TicketFlowDemo = api;
}(typeof globalThis === "undefined" ? this : globalThis));
