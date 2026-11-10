/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

export type Language = "en";
type TranslationParams = Record<string, string | number>;

type Dictionary = Record<string, string>;

const EN: Dictionary = {
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.unknown": "Unknown",
  "common.active": "Active",
  "nav.dashboard": "Dashboard",
  "nav.workflows": "Workflows",
  "nav.inbox": "Inbox",
  "nav.channel": "Channel",
  "nav.activity": "Audit Log",
  "nav.apiKeys": "API Keys",
  "nav.settings": "Settings",
  "nav.help": "Help & Support",
  "nav.workspace": "Workspace",
  "nav.preferences": "Preferences",

  "topnav.label": "Main menu",
  "topnav.data": "Dashboard",
  "topnav.inbox": "Inbox",
  "topnav.channel": "Channel",
  "topnav.agent": "Agent",
  "topnav.settings": "Settings",

  "notifications.title": "Notifications",
  "notifications.markAllRead": "Mark all as read",
  "notifications.empty": "No notifications",
  "notifications.unreadCount": "{count} unread",

  "notif.workflow.created": "New workflow created",
  "notif.workflow.created.desc": "{name} was added",
  "notif.workflow.error": "Workflow error",
  "notif.workflow.error.desc": "{name} failed to execute",
  "notif.api.key.added": "API key added",
  "notif.api.key.added.desc": "{provider} API key was connected",
  "notif.api.key.edited": "API key updated",
  "notif.api.key.edited.desc": "{provider} API key was modified",
  "notif.profile.updated": "Profile updated",
  "notif.profile.updated.desc": "Your account details were changed",
  "notif.login": "New login",
  "notif.login.desc": "Signed in from a new session",
  "topnav.notifications": "Notifications",

  "side.templateGroup": "TEMPLATE",
  "side.chatTemplate": "Chat Template",
  "side.metaTemplate": "Meta Template",
  "side.automatedMessage": "Automated Message",
  "side.workflowGroup": "WORKFLOW",
  "side.workflow": "Workflow",
  "side.playbook": "Playbook",
  "side.componentTemplate": "Component Template",
  "side.auditLog": "Audit Log",
  "side.soon": "Coming soon",
  "side.soonShort": "Soon",
  "side.openMenu": "Open menu",

  "common.retry": "Try again",

  "execution.back": "Back to Audit Log",
  "execution.titleSession": "Session audit #{id}",
  "execution.titleExecution": "Execution audit #{id}",
  "execution.loadingWorkflow": "Loading workflow…",
  "execution.subtitle":
    "{name} · Audit every step, workflow transition, input, output, and token usage.",
  "execution.contact": "Contact",
  "execution.contactMissing": "not recorded",
  "execution.session": "Session",
  "execution.activeWorkflow": "Active workflow:",
  "execution.refresh": "Refresh",
  "execution.loadError":
    "Failed to load execution details. Check the backend connection.",
  "execution.detailUnavailable": "Execution details are unavailable.",
  "execution.duration": "Duration",
  "execution.totalTokens": "Total tokens",
  "execution.promptCompletion": "{prompt} prompt · {completion} completion",
  "execution.steps": "Steps",
  "execution.failedCount": "{count} failed",
  "execution.time": "Time",
  "execution.finished": "Finished {date}",
  "execution.notFinished": "Not finished",
  "execution.nodeLabel": "Node:",
  "execution.fixTitle": "How to fix",
  "execution.errorSummaryTitle": "Error Summary",
  "execution.nodeErrorTitle": "Node Error",
  "execution.timeline": "Step timeline",
  "execution.stepsShown": "{shown} of {total} steps shown.",
  "execution.nodeFilter": "Node",
  "execution.allNodes": "All nodes",
  "execution.stepStatus": "Step status",
  "execution.allStatuses": "All statuses",
  "execution.success": "Success",
  "execution.error": "Failed",
  "execution.reset": "Reset",
  "execution.auditUnavailable": "Step audit is not available yet",
  "execution.auditUnavailableHint":
    "This execution was created before per-step auditing was enabled. The summary log below is still available.",
  "execution.stepFallback": "Step",
  "execution.noSummaryLogs": "No summary logs for this execution.",
  "execution.noMatchingSteps": "No steps match the filters.",
  "execution.input": "Input",
  "execution.finalOutput": "Final output",
  "execution.escalatedNoReply":
    "Conversation was handed off to an admin; AI did not reply.",
  "execution.finishedNoMessage": "Workflow finished without a message.",
  "execution.noOutput": "No output.",
  "execution.sentMessages": "Sent messages",
  "execution.variables": "Variables",
  "execution.stepInput": "Step input",
  "execution.stepOutput": "Step output",
  "execution.branchIf": "If match",
  "execution.branchElse": "Else",
  "execution.stepTokens": "{count} tokens",
  "execution.secondsShort": "s",
  "execution.yes": "Yes",
  "execution.no": "No",
  "execution.node.trigger": "Trigger",
  "execution.node.aiAgent": "AI Agent",
  "execution.node.output": "Send Message",
  "execution.node.condition": "Condition",
  "execution.node.relocate": "Relocate",
  "execution.node.goTo": "Go To",
  "execution.node.stopper": "Stopper",

  "editor.currentWorkflowName": "This workflow",
  "editor.default.triggerName": "Incoming message",
  "editor.default.triggerDescription": "Start when a visitor sends a message",
  "editor.default.agentName": "AI response",
  "editor.default.agentDescription": "Generate an AI response",
  "editor.default.agentSystem":
    "You are a helpful assistant. Answer the visitor clearly and politely.",
  "editor.default.customerMessageDescription":
    "Message sent by the visitor",
  "editor.default.outputDescription":
    "AI reply; each item is sent as a bubble",
  "editor.default.sendName": "Send message",
  "editor.default.sendDescription": "Send a message to the visitor",
  "editor.default.conditionName": "Check condition",
  "editor.default.conditionDescription": "Branch on a yes/no variable",
  "editor.default.goToName": "Go to step",
  "editor.default.goToDescription": "Jump to another step",
  "editor.default.relocateName": "Handoff to admin",
  "editor.default.relocateDescription":
    "Escalate the conversation to a human",
  "editor.default.stopperName": "Wait for next message",
  "editor.default.stopperDescription":
    "Wait for the next customer message",

  "editor.validation.multipleTrigger.title": "More than one Trigger",
  "editor.validation.multipleTrigger.message":
    "This workflow has {count} Triggers. Only the workflow entry may have one Trigger.",
  "editor.validation.multipleTrigger.fix":
    "Remove the extra Trigger. Follow-up workflows are entered through Go To and do not need a Trigger.",
  "editor.validation.triggerUnconnected.title": "Trigger is not connected",
  "editor.validation.triggerUnconnected.message":
    "Node \"{name}\" has no outgoing connection.",
  "editor.validation.triggerUnconnected.fix":
    "Connect the Trigger port to the first node, for example AI Agent.",
  "editor.validation.agentConflict.title": "AI Agent name conflict",
  "editor.validation.agentConflict.message":
    "Namespace \"{namespace}\" is used by \"{first}\" and \"{second}\".",
  "editor.validation.agentConflict.fix":
    "Give every AI Agent a unique name so smart values do not mix.",
  "editor.validation.emptyPrompt.title": "AI Agent prompt is empty",
  "editor.validation.emptyPrompt.message":
    "AI Agent \"{name}\" has no system prompt.",
  "editor.validation.emptyPrompt.fix":
    "Fill the prompt with the role, goal, tone, and rules for when variables should be filled.",
  "editor.validation.invalidVariable.title": "Invalid variable name",
  "editor.validation.invalidVariable.message":
    "Variable \"{name}\" on \"{node}\" contains spaces or unsupported characters.",
  "editor.validation.invalidVariable.fix":
    "Use letters, numbers, and underscores without spaces. Example: mau_beli. Keep the name consistent in the AI prompt and Condition.",
  "editor.validation.duplicateVariable.title": "Duplicate variable name",
  "editor.validation.duplicateVariable.message":
    "Variable \"{name}\" appears more than once on \"{node}\".",
  "editor.validation.duplicateVariable.fix":
    "Rename one of them so every variable has a unique name.",
  "editor.validation.invalidItemField.title": "Invalid list item name",
  "editor.validation.invalidItemField.message":
    "Item field \"{field}\" on variable \"{name}\" contains unsupported characters.",
  "editor.validation.invalidItemField.fix":
    "Use a name without spaces, for example replies or product_list.",
  "editor.validation.conditionNoVariable.title":
    "Condition has not selected a variable",
  "editor.validation.conditionNoVariable.message":
    "Condition \"{name}\" has no boolean variable.",
  "editor.validation.conditionNoVariable.fix":
    "Choose a Yes-No variable from a connected AI Agent before the Condition.",
  "editor.validation.conditionInvalidSmart.title":
    "Condition uses an invalid smart value",
  "editor.validation.conditionInvalidSmart.message":
    "Condition \"{name}\" uses \"{field}\". Use the {{agent-name.variable}} format.",
  "editor.validation.conditionInvalidSmart.fix":
    "Choose a smart value from the nearest AI Agent, for example recommendation-offer.want_to_buy.",
  "editor.validation.conditionUnavailable.title":
    "Condition uses an unavailable variable",
  "editor.validation.conditionUnavailable.message":
    "Variable \"{field}\" is not produced by an AI Agent before Condition \"{name}\".",
  "editor.validation.conditionUnavailable.fix":
    "Connect the AI Agent that produces {field}, or choose one of these smart values: {values}.",
  "editor.validation.emptyMessage.title": "Empty message",
  "editor.validation.emptyMessage.message":
    "Send Message \"{name}\" has no message content.",
  "editor.validation.emptyMessage.fix":
    "Write a message, or insert a variable such as {{respond.replies}} from an AI Agent.",
  "editor.validation.goToNoTarget.title": "Go To has no target",
  "editor.validation.goToNoTarget.message":
    "Go To node \"{name}\" has no target node.",
  "editor.validation.goToNoTarget.fix":
    "Choose a target workflow and node, then save again.",
  "editor.validation.goToWorkflowMissing.title":
    "Target workflow not found",
  "editor.validation.goToWorkflowMissing.message":
    "Go To \"{name}\" points to a workflow that is not available on this account.",
  "editor.validation.goToWorkflowMissing.fix":
    "Choose the target workflow again. Make sure it still exists and belongs to the same account.",
  "editor.validation.goToNodeMissing.title":
    "Go To target node not found",
  "editor.validation.goToNodeMissing.message":
    "Node \"{node}\" does not exist in workflow \"{workflow}\".",
  "editor.validation.goToNodeMissing.fix":
    "Choose the target node again. If the node was renamed or deleted, update the Go To.",
  "editor.validation.goToSelf.title": "Go To points to itself",
  "editor.validation.goToSelf.message":
    "Go To node \"{name}\" will loop without progress.",
  "editor.validation.goToSelf.fix":
    "Choose another node after Go To, or move to a different workflow.",

  "editor.title": "Workflow editor",
  "editor.canvasMeta": "Workflow canvas · {count} steps",
  "editor.loading": "Loading",
  "editor.unsaved": "Unsaved changes",
  "editor.saved": "Saved",
  "editor.saving": "Saving...",
  "editor.save": "Save",
  "editor.issues": "{count} issues need fixing before saving",
  "editor.closeIssues": "Close issue list",
  "editor.closeLibraryShort": "Close library",
  "editor.nodeLibrary": "Node Library",
  "editor.tidy": "Tidy",
  "editor.tidyHint":
    "Automatically arrange nodes so the canvas stays neat and readable",
  "editor.tidyNotice": "Layout tidied. {count} duplicate edge(s) removed.",
  "editor.tidyClean": "Layout tidied.",
  "editor.duplicateEdge": "This connection already exists.",
  "editor.builder": "Builder",
  "editor.chooseStep": "Choose a step to add to your workflow.",
  "editor.loadingWorkflow": "Loading workflow...",
  "editor.canvasHint":
    "Drag between ports to connect steps · Select a node to configure it",
  "editor.chatWidget": "Chat Widget",
  "editor.triggerWidgetHint":
    "The Trigger starts the workflow when a customer message arrives from the chat widget.",
  "editor.openLibrary": "Open",
  "editor.closeLibrary": "Close",
  "editor.addComponent": "Add a Component",
  "editor.addComponentDesc": "Add a component to your workflow",
  "editor.searchComponents": "Search components...",
  "editor.noComponentsFound": "No matching components found",
  "editor.allComponents": "All Components",
  "editor.componentCount": "{count} components",
  "editor.workflow": "Workflow",
  "editor.addTrigger": "Add a Trigger",
  "editor.addTriggerDesc": "An event that triggers the workflow run",
  "editor.addAction": "Add an Action",
  "editor.addActionDesc": "Choose what action to perform when your workflow runs",
  "editor.addCondition": "If Else / Condition",
  "editor.addConditionDesc": "Create one condition — if true, the action runs; otherwise it's skipped",
  "editor.blockSelect": "Block select",
  "editor.deleteSelected": "Delete selected",
  "editor.blockModeActive": "Block mode active",
  "editor.libraryBack": "Back to categories",
  "editor.nodeSettings": "Node settings",
  "editor.closeNodeSettings": "Close node settings",
  "editor.nodeName": "Node name",
  "editor.giveName": "Give this node a name",
  "editor.description": "Description",
  "editor.triggerTitle": "Incoming chat message",
  "editor.triggerDescription":
    "The workflow starts when a customer sends a message.",
  "editor.customerMessage": "Customer message",
  "editor.triggerTokenHint":
    "The customer message is automatically available in AI Agent as {message} and the visitor name as {name}.",
  "editor.triggerNote":
    "Trigger is only used for the workflow entry. Follow-up workflows do not need a Trigger and are entered through cross-workflow Go To.",
  "editor.aiSettings": "AI Agent settings",
  "editor.tabNode": "Node",
  "editor.tabPrompt": "Prompt",
  "editor.tabVariables": "Variables",
  "editor.systemPrompt": "System prompt",
  "editor.systemPromptHint": "Set the AI role, tone, and guardrails.",
  "editor.systemPromptPlaceholder":
    "You are a helpful assistant. Answer clearly, stay on brand, and ask a follow-up question when needed...",
  "editor.characters": "{count} characters",
  "editor.insertDynamic": "Insert dynamic values",
  "editor.clickToken": "Click a token to insert it at the cursor position.",
  "editor.promptTip":
    "State the goal, tone, and things to avoid. Long prompts stay readable because the panel scrolls.",
  "editor.outputVariables": "Output variables",
  "editor.outputVariablesHint":
    "Values the AI fills automatically for the next nodes.",
  "editor.add": "Add",
  "editor.removeVariable": "Remove variable",
  "editor.typeText": "Text",
  "editor.typeBoolean": "Yes-No (Condition)",
  "editor.typeArray": "List (bubbles)",
  "editor.variableNameError":
    "No spaces. Use letters, numbers, and underscores, for example mau_beli.",
  "editor.variableDescriptionPlaceholder": "AI answer for the customer",
  "editor.noVariables": "No variables yet",
  "editor.noVariablesHint":
    "Add variables so the AI can fill values for the next nodes.",
  "editor.addVariable": "Add variable",
  "editor.listHint":
    "Use the List type to reply with multiple chat bubbles at once.",
  "editor.nodeNameExample": "e.g. Answer customer questions",
  "editor.aiModel": "AI model",
  "editor.aiModelHint":
    "The model follows the API key saved in the API Keys menu.",
  "editor.noApiKey":
    "No API key saved yet. The default Gemini list is still available, or configure a provider in the API Keys menu.",
  "editor.verbosity": "Verbosity",
  "editor.verbosityConcise": "Concise · short",
  "editor.verbosityBalanced": "Balanced",
  "editor.verbosityDetailed": "Detailed",
  "editor.verbosityHint": "Concise keeps answers short and to the point.",
  "editor.contextMemory": "Context memory",
  "editor.contextNone": "No history",
  "editor.contextMessages": "Last {count} messages",
  "editor.contextHint": "Number of previous messages sent to the AI.",
  "editor.temperature": "Temperature: {value}",
  "editor.moreFocused": "More focused",
  "editor.moreCreative": "More creative",
  "editor.messageConfig": "Message configuration",
  "editor.messageConfigHint":
    "Compose a static reply or use dynamic values.",
  "editor.message": "Message",
  "editor.messagePlaceholder": "Hi {{customer_name}}, how can I help?",
  "editor.previewEmpty": "Your message preview will appear here.",
  "editor.listDetected":
    "List detected: each item will be sent as a separate chat bubble.",
  "editor.blueTokens":
    "Blue tokens are dynamic values provided by connected AI Agent nodes.",
  "editor.condition": "Condition",
  "editor.conditionHint":
    "Choose a boolean smart value from the nearest AI Agent. If the condition is met, the flow goes to If match; otherwise it goes to Else.",
  "editor.noBoolean":
    "No boolean variables yet. Add a Yes-No variable in the connected AI Agent before this node.",
  "editor.booleanSmartValue": "Boolean smart value",
  "editor.conditionVariableHint":
    "Smart values use the nearest AI Agent name so variables from earlier nodes do not mix.",
  "editor.ifMatch": "If match",
  "editor.ifMatchHint": "Branch when the condition is met.",
  "editor.else": "Else",
  "editor.elseHint": "Branch when the condition is not met.",
  "editor.conditionPorts":
    "Connect the green port (If match) and red port (Else) to the next steps.",
  "editor.goTo": "Go To",
  "editor.goToHint": "Jump to another node without drawing extra connections.",
  "editor.targetWorkflow": "Target workflow",
  "editor.currentWorkflowSuffix": "{name} (this workflow)",
  "editor.targetNode": "Target node",
  "editor.chooseTargetNode": "Choose a target node…",
  "editor.endFlow": "End flow",
  "editor.endFlowHint":
    "Stop at the target node first. The flow continues when the customer sends another message. When disabled, the target node runs in the same turn.",
  "editor.goToWorkflowNote":
    "Go To can move to another workflow. The target workflow does not need a Trigger. Variables from the previous workflow remain available in the conversation context.",
  "editor.handoff": "Handoff to admin",
  "editor.handoffHint":
    "When the flow reaches this node, AI stops replying. The conversation is marked as handled by a human admin, and the next customer message is not answered by AI.",
  "editor.relocateNote":
    "Place Relocate at the end of the flow, for example after a Condition detects that the customer wants human help.",
  "editor.pausePoint": "Pause point",
  "editor.pauseHint":
    "This step pauses the workflow. When the customer sends another message, execution continues from the next connected step.",
  "editor.cancel": "Cancel",
  "editor.saveChanges": "Save changes",
  "editor.draft": "Draft workflow",
  "editor.steps": "{count} steps",
  "editor.connections": "{count} connections",
  "editor.dismiss": "Dismiss notification",
  "editor.unsavedTitle": "Unsaved workflow changes",
  "editor.unsavedHint":
    "You have changes that are not saved yet. Save them before leaving?",
  "editor.unsavedWarningCallout":
    "Any unsaved step configurations or connection changes will be lost if you leave without saving.",
  "editor.continueEditing": "Continue editing",
  "editor.discardLeave": "Discard & leave",
  "editor.saveLeave": "Save & leave",
  "editor.untitledStep": "Untitled step",
  "editor.deleteNode": "Delete node",
  "editor.deleteNodeNamed": "Delete {name}",
  "editor.chooseBoolean": "Choose a boolean variable",
  "editor.chooseVariable": "Choose a variable",
  "editor.availableValues": "Available values",
  "editor.noVariablesSuggestion":
    "Connect an AI Agent before this step and define its variables to see suggestions.",
  "editor.loadError": "Failed to load workflow. Try again.",
  "editor.saveError": "Failed to save workflow. Try again.",
  "editor.changesApplied":
    "Changes applied to the canvas. Save the workflow to keep them.",
  "editor.saveFirst": "Save the workflow from the Workflows page first.",
  "editor.savedNotice": "Workflow saved.",
  "editor.node.triggerDesc": "Start from a chat message",
  "editor.node.agentDesc": "Generate replies and decisions",
  "editor.node.outputDesc": "Reply with one or more bubbles",
  "editor.node.conditionDesc": "Branch on a yes/no variable",
  "editor.node.goToDesc": "Jump to another step",
  "editor.node.relocateDesc": "Hand the chat to a human admin",
  "editor.node.stopperDesc": "Pause until the next customer message",
  "editor.token.customerMessage": "Last customer message",
  "editor.token.customerName": "Customer name",

  "activity.title": "Audit Log",
  "activity.subtitle":
    "One log per customer session, covering every workflow executed through Go To.",
  "activity.refresh": "Refresh",
  "activity.loadError": "Failed to load the audit log. Check the backend connection.",
  "activity.total": "Total",
  "activity.success": "Success",
  "activity.failed": "Failed",
  "activity.waiting": "Waiting",
  "activity.running": "Running",
  "activity.escalated": "To admin",
  "activity.latestTitle": "Recent sessions",
  "activity.latestDescription":
    "Filter by status and date, then open a session to audit each step and workflow.",
  "activity.loadedCount": "{count} sessions loaded",
  "activity.statusLabel": "Status",
  "activity.allStatus": "All statuses",
  "activity.fromDate": "From date",
  "activity.toDate": "To date",
  "activity.apply": "Apply",
  "activity.reset": "Reset",
  "activity.quickRange": "Quick range",
  "activity.presetToday": "Today",
  "activity.preset7": "7 days",
  "activity.preset30": "30 days",
  "activity.activeFilter": "Active filters",
  "activity.removeStatus": "Remove status filter",
  "activity.removeDate": "Remove date filter",
  "activity.dateStart": "Start",
  "activity.dateEnd": "Now",
  "activity.noMatch": "No matching sessions",
  "activity.empty": "No sessions yet",
  "activity.noMatchHint":
    "Change the status or date range, then apply the filters again.",
  "activity.emptyHint":
    "Open Channel and start a conversation through the widget to see the audit log here.",
  "activity.loadMore": "Load more",
  "activity.workflowFallback": "Workflow #{id}",
  "activity.session": "Session {id}",
  "activity.steps": "{count} steps",
  "activity.contact": "Contact {name}",
  "activity.contactMissing": "Contact not recorded",
  "activity.tokens": "{count} tokens",
  "activity.noTokens": "No tokens",
  "activity.detail": "View detail",

  "activity.col.no": "No",
  "activity.col.sessionId": "Session Id",
  "activity.col.contactId": "Contact Id",
  "activity.col.contactName": "Contact Name",
  "activity.col.sessionCreated": "Session Created",
  "activity.col.logStatus": "Log Status",
  "activity.col.workflow": "Workflow",
  "activity.detail.title": "Audit Detail",
  "activity.detail.sessionCreate": "Session Create",
  "activity.detail.flowSection": "Flow Section",
  "activity.detail.expandAll": "Expand All",
  "activity.detail.export": "Export",
  "activity.detail.activityLog": "Activity Log",
  "activity.detail.chatTranscript": "Chat Transcript",
  "activity.detail.respondId": "Respond Id",
  "activity.detail.searchPlaceholder": "Search audit log...",
  "activity.detail.searchAria": "Search audit log",
  "activity.detail.range": "Showing {from}–{to} of {total}",
  "activity.previous": "Previous",
  "activity.next": "Next",
  "activity.col.actions": "Actions",

  "inbox.title": "Inbox",
  "inbox.subtitle":
    "Complete history per contact, with per-session takeover.",
  "inbox.conversations": "Conversations",
  "inbox.filterAll": "All",
  "inbox.contactDetails": "Contact details",
  "inbox.workflowLabel": "Workflow",
  "inbox.lastActivity": "Last activity",
  "inbox.sessionInfo": "Latest session",
  "inbox.sessionsLabel": "Sessions",
  "inbox.messagesLabel": "Messages",
  "inbox.enterToSend": "Enter to send, Shift + Enter for a new line.",
  "inbox.contactCount": "{count} contacts",
  "inbox.refresh": "Refresh",
  "inbox.searchPlaceholder": "Search name, ID, or message...",
  "inbox.searchAria": "Search contacts",
  "inbox.listError": "Failed to load contacts. Check the backend connection.",
  "inbox.detailError": "Failed to load contact history. Try again.",
  "inbox.actionError": "Failed to change conversation status. Try again.",
  "inbox.takeoverNotice":
    "Conversation taken over. You can reply as an admin.",
  "inbox.releaseNotice": "Conversation returned to AI.",
  "inbox.replySent": "Admin reply sent.",
  "inbox.replyError": "Failed to send admin reply. Try again.",
  "inbox.emptyQuery": "No contacts found",
  "inbox.emptyTitle": "Inbox is empty",
  "inbox.emptyQueryHint": "Try another keyword.",
  "inbox.emptyHint":
    "Contacts appear after a customer sends a message through the Channel widget.",
  "inbox.noMessages": "No messages yet",
  "inbox.status.active": "AI active",
  "inbox.status.human": "Admin",
  "inbox.status.ended": "Ended",
  "inbox.sessionCount": "{count} sessions",
  "inbox.messageCount": "{count} messages",
  "inbox.selectTitle": "Select a contact",
  "inbox.selectHint":
    "Choose a contact on the left to view full session history and take over the conversation.",
  "inbox.detailUnavailable": "Contact details are unavailable.",
  "inbox.back": "Back to contact list",
  "inbox.takeover": "Take over",
  "inbox.release": "Return to AI",
  "inbox.noSessions": "No sessions for this contact yet.",
  "inbox.replyPlaceholder": "Reply as admin...",
  "inbox.sendReply": "Send admin reply",
  "inbox.replyHint":
    "You are replying as admin. AI stays paused until the conversation is returned.",
  "inbox.aiHandling": "AI is handling this session. Take over to reply.",
  "inbox.endedHint":
    "This session has ended. The customer needs to open a new widget session.",
  "inbox.sessionLabel": "Session #{id}",
  "inbox.latest": "latest",
  "inbox.dayUnknown": "Unknown date",
  "inbox.noSessionMessages": "No messages in this session yet.",
  "inbox.admin": "Admin",


  "health.operational": "Operational",
  "health.offline": "Offline",
  "health.checking": "Checking",
  "footer.tagline": "Connect Intelligence. Automate Everything.",
  "header.workspace": "Workspace",
  "header.workspaceAdmin": "Workspace admin",
  "header.logout": "Log out",
  "header.loggingOut": "Logging out...",

  "pref.language": "Language",
  "pref.toggleLanguage": "Toggle language",

  "auth.checking": "Checking your session...",
  "auth.logoutError": "Logout failed. Please try again.",

  "login.badge": "AUTOMATION WORKSPACE",
  "login.headline1": "Automate the routine.",
  "login.headline2": "Focus on what matters.",
  "login.description":
    "Build, connect, and manage intelligent workflows in one workspace designed for your team.",
  "login.preview.title": "Customer support",
  "login.preview.subtitle": "Workflow preview",
  "login.preview.configured": "Configured",
  "login.preview.trigger": "Trigger",
  "login.preview.triggerDetail": "New message",
  "login.preview.ai": "AI Agent",
  "login.preview.aiDetail": "Process input",
  "login.preview.response": "Response",
  "login.preview.responseDetail": "Send reply",
  "login.preview.footer": "Connected steps, one seamless flow.",
  "login.brandFooter": "Orqiva · Connect Intelligence. Automate Everything.",
  "login.private": "Private workspace",
  "login.welcome": "Welcome back",
  "login.title": "Sign in to Orqiva",
  "login.subtitle": "Enter your password to access your workspace.",
  "login.password": "Password",
  "login.defaultPasswordHint": "Default password: 12345",
  "login.showPassword": "Show password",
  "login.hidePassword": "Hide password",
  "login.submit": "Sign in",
  "login.submitting": "Signing in...",
  "login.error": "Login failed. Check your password and backend connection.",
  "login.secure": "Internal workspace. Access is restricted to authorized users.",
  "login.checkingSetup": "Preparing Orqiva...",
  "login.setupWelcome": "Create your first account",
  "login.setupSubtitle":
    "Set up an admin account for this Orqiva workspace.",
  "login.name": "Name",
  "login.namePlaceholder": "Your name",
  "login.confirmPassword": "Confirm password",
  "login.passwordHint": "At least 8 characters. Use a strong password.",
  "login.passwordMismatch": "Passwords do not match.",
  "login.setupSubmit": "Create account",
  "login.setupSubmitting": "Creating account...",
  "login.setupLocal": "Your account is stored locally on this device.",

  "settings.eyebrow": "Preferences",
  "settings.title": "Settings",
  "settings.subtitle":
    "Account profile, AI provider connections, and workspace service status.",
  "settings.aiTitle": "AI connection",
  "settings.aiDescription":
    "Manage Gemini, OpenAI, and OpenRouter API keys. Saved keys are used by workflows immediately without editing `.env`.",
  "settings.manageKeys": "Manage API Keys",
  "settings.account": "Account",
  "settings.accountDescription": "The currently active user profile.",
  "settings.profileEdit": "Edit profile",
  "settings.profileName": "Name",
  "settings.profilePassword": "New password",
  "settings.profilePasswordOptional": "(optional, leave blank to keep the current password)",
  "settings.currentPassword": "Current password",
  "settings.profileHint": "Leave the new password blank if you do not want to change it.",
  "settings.saveProfile": "Save profile",
  "settings.saving": "Saving...",
  "settings.profileSaved": "Your profile has been updated.",
  "settings.profileError": "Failed to update profile. Try again.",
  "settings.profileErrorCurrent": "Current password is incorrect.",

  "settings.name": "Name",
  "settings.status": "Service status",
  "settings.statusDescription": "Frontend connection to the Orqiva service.",
  "settings.serviceLabel": "Service status",
  "settings.tokenTracking": "Token tracking",
  "settings.license": "License",
  "settings.version": "Version",
  "settings.madeBy": "Built by Azarya Geraldo.",

  "help.eyebrow": "Help center",
  "help.title": "Help & Support",
  "help.subtitle":
    "Complete guides to install Orqiva, build workflows, connect channels, and run it in production.",
  "help.search": "Search documentation...",
  "help.license": "License & attribution",
  "help.licenseDescription":
    "Orqiva is released under the MIT License. You may use, modify, and distribute this software as long as attribution is preserved.",
  "help.developer": "Developer",
  "help.developerDescription":
    "Documentation is built and maintained by Azarya Geraldo. Reach out through the channels below for questions, feedback, or collaboration.",
  "help.socialGithub": "GitHub",
  "help.socialTiktok": "TikTok",
  "help.socialLinkedin": "LinkedIn",
  "help.socialInstagram": "Instagram",
  "help.copy": "Copy",
  "help.copied": "Copied",
  "help.config": "Configuration",
  "help.output": "Output",
  "help.notes": "Notes",
  "help.schema": "Schema example",
  "help.description": "Description",
  "help.repository": "Repository",

  "help.section.account.title": "Account and login",
  "help.section.account.intro":
    "Orqiva currently uses a single login without public registration. The admin account is created by a seeder and can be replaced before production.",
  "help.section.ai.title": "API keys and AI providers",
  "help.section.ai.intro":
    "Orqiva uses BYOK (Bring Your Own Key). API keys are encrypted in the database and are never returned to the browser.",
  "help.section.workflow.title": "Workflows and nodes",
  "help.section.workflow.intro":
    "A workflow is a graph of nodes and edges. Every entry workflow must have one Trigger and at least one Send Message or Relocate.",
  "help.section.channel.title": "Channels and widget",
  "help.section.channel.intro":
    "Channels connect workflows to customers. The website widget and Telegram bot are available; connect the bot with a token from @BotFather. Telegram messages use long polling, so no public URL is required.",
  "help.section.inbox.title": "Inbox and human handoff",
  "help.section.inbox.intro":
    "AI handles conversations automatically. Admins can take over a session, reply manually, then release it back to AI.",
  "help.section.audit.title": "Audit and troubleshooting",
  "help.section.audit.intro":
    "Every execution records steps, input, output, tokens, and errors. Use Audit Log to trace failures.",
  "help.section.security.title": "Security and production",
  "help.section.security.intro":
    "Before production, change default credentials, use HTTPS, configure CORS, disable debug mode, and back up the database regularly.",
  "help.section.license.title": "License and contributions",
  "help.section.license.intro":
    "This project uses the MIT License. Contributions, issues, and documentation improvements are welcome.",

  "channel.widgetName": "Website Chat Widget",
  "channel.widgetDescription":
    "Embed a chat widget on your website and connect it to an entry workflow.",
  "channel.telegram": "Telegram bot",
  "channel.whatsapp": "WhatsApp Business",
  "channel.instagram": "Instagram DM",
  "channel.messenger": "Facebook Messenger",
  "channel.telegramDescription":
    "Connect a Telegram bot to receive customer messages.",
  "channel.whatsappDescription":
    "Reply to WhatsApp Business chats directly from Orqiva.",
  "channel.instagramDescription":
    "Handle Instagram direct messages from one inbox.",
  "channel.messengerDescription":
    "Connect Facebook Messenger for customer conversations.",
  "channel.eyebrow": "Workspace",
  "channel.subtitle":
    "One widget and one Telegram bot per account. Both start from an entry workflow, then continue through Go To steps.",
  "channel.widgetActive": "Widget active",
  "channel.widgetInactive": "Widget inactive",
  "channel.errorLoad": "Channel failed to load. Reload the page.",
  "channel.errorSave": "Channel failed to save. Check the settings.",
  "channel.errorToken": "Widget token failed to update.",
  "channel.errorCopyUrl": "The link could not be copied. Copy the URL manually.",
  "channel.errorCopySnippet":
    "The snippet could not be copied. Copy the code manually.",
  "channel.confirmRegenerate":
    "Regenerate the widget token? Old links stop working immediately and must be reinstalled.",
  "channel.noticeSaved": "Widget settings updated.",
  "channel.noticeRegenerated": "Widget token updated.",
  "channel.catalogTitle": "Available channels",
  "channel.catalogDescription":
    "The website widget and Telegram bot are ready. Other channels are coming soon.",
  "channel.catalogCount": "{active} active · {soon} coming soon",
  "channel.cardActive": "Active",
  "channel.cardInactive": "Inactive",
  "channel.cardComingSoon": "Coming soon",
  "channel.cardNotConnected": "Not connected",
  "channel.telegramConnect": "Connect",
  "channel.telegramManage": "Manage bot",
  "channel.telegramDialogTitle": "Telegram bot",
  "channel.telegramDialogDescription":
    "Paste the bot token from @BotFather. Incoming messages use long polling, so no public URL is needed.",
  "channel.botTokenLabel": "Bot token",
  "channel.botTokenHint":
    "Create a bot with @BotFather, then copy its token. The token is stored encrypted.",
  "channel.botTokenKeepHint": "Leave empty to keep the saved token.",
  "channel.telegramConnectedAs": "Connected as {username}",
  "channel.telegramLastError": "Last error: {error}",
  "channel.telegramActivateHint":
    "Enable this to let the bot reply to customer messages. Choose an entry workflow first.",
  "channel.telegramSave": "Save bot",
  "channel.telegramSaved": "Telegram bot saved.",
  "channel.telegramTokenRequired": "Enter the Telegram bot token.",
  "channel.telegramError":
    "The Telegram bot could not be saved. Check the token and internet connection.",
  "channel.editWidgetTitle": "Edit widget",
  "channel.openWidgetTitle": "Open widget",
  "channel.regenerateTitle": "Regenerate widget token",
  "channel.linkTitle": "Widget link",
  "channel.linkDescription":
    "Copy the URL to install it or share it with customers.",
  "channel.tokenUnavailable": "Token is not available yet",
  "channel.copiedUrl": "Copied",
  "channel.copyUrl": "Copy URL",
  "channel.crossTitle": "Cross-workflow routing",
  "channel.crossDescription":
    "Entry workflows can use Go To to continue into another workflow. Continuation workflows do not need a Trigger and stay in the same session audit log.",
  "channel.dialogTitle": "Edit website widget",
  "channel.dialogDescription":
    "Configure the widget name, entry workflow, welcome message, and input placeholder.",
  "channel.nameLabel": "Channel name",
  "channel.namePlaceholder": "Website Chat Widget",
  "channel.workflowLabel": "Entry workflow",
  "channel.selectWorkflow": "Select a workflow...",
  "channel.noneSelected": "Not selected",
  "channel.noTriggerWarning":
    "No workflow has a Trigger node yet. Add a Trigger to an entry workflow first.",
  "channel.welcomeLabel": "Welcome message",
  "channel.optional": "(optional)",
  "channel.welcomePlaceholder": "Hi! How can we help you today?",
  "channel.welcomeHint":
    "Leave this empty to hide the welcome message.",
  "channel.placeholderLabel": "Input placeholder",
  "channel.placeholderPlaceholder": "Type a message...",
  "channel.placeholderHint":
    "Leave this empty to use the default placeholder.",
  "channel.openModeTitle": "Widget open behavior",
  "channel.openModeDescription":
    "Choose whether visitors must press the button or the chat opens automatically.",
  "channel.openModeManual": "Open manually",
  "channel.openModeManualHint":
    "The widget stays hidden until the visitor presses the chat button.",
  "channel.openModeAlways": "Always open",
  "channel.openModeAlwaysHint":
    "The chat opens automatically when the page or link is opened.",
  "channel.appearanceTitle": "Widget colors",
  "channel.appearanceDescription":
    "Defaults follow Telegram dark. Adjust the colors to match your brand.",
  "channel.resetColors": "Reset to Telegram",
  "channel.headerColor": "Header color",
  "channel.backgroundColor": "Chat background",
  "channel.outgoingColor": "Customer bubble",
  "channel.accentColor": "Accent color",
  "channel.previewIncoming": "Hi, how can we help?",
  "channel.previewOutgoing": "I have a question.",
  "channel.previewTitle": "Widget preview",
  "channel.installTitle": "Install on your website",
  "channel.widgetOffline": "offline",
  "channel.iconsTitle": "Widget icons",
  "channel.iconsDescription":
    "Use the Orqiva logo or upload your own icon.",
  "channel.chatIcon": "Chat icon",
  "channel.chatIconHint": "Shown as the avatar in the chat header.",
  "channel.launcherIcon": "Toggle icon",
  "channel.launcherIconHint":
    "Shown on the launcher button on your website.",
  "channel.uploadIcon": "Upload",
  "channel.removeIcon": "Remove icon",
  "channel.iconHint":
    "PNG, JPG, or WebP. Square, up to 1 MB. Icons are cropped automatically.",
  "channel.iconSaved": "Widget icon updated.",
  "channel.iconRemoved": "Icon restored to the Orqiva logo.",
  "channel.iconError": "The icon could not be updated. Try again.",
  "channel.iconTypeError": "The icon must be a PNG, JPG, or WebP file.",
  "channel.iconSizeError": "The icon must be 1 MB or smaller.",
  "channel.activateLabel": "Enable the public widget",
  "channel.activateHint":
    "The widget only accepts messages when it is active and has an entry workflow.",
  "channel.updateWidget": "Update widget",
  "channel.workflowFallback": "Workflow",

  "wf.eyebrow": "Workspace",
  "wf.subtitle":
    "Create, organize, and manage workflow automation in one place.",
  "wf.create": "Create workflow",
  "wf.searchPlaceholder": "Search workflows...",
  "wf.searchAria": "Search workflows",
  "wf.searchShort": "Search workflows...",
  "wf.col.no": "No",
  "wf.col.name": "Name",
  "wf.col.tag": "Tag",
  "wf.col.status": "Status",
  "wf.col.createdBy": "Created by",
  "wf.col.createdAt": "Created at",
  "wf.col.updatedBy": "Updated by",
  "wf.col.updatedAt": "Updated at",
  "wf.col.actions": "Actions",
  "wf.selectAll": "Select all workflows",
  "wf.selectOne": "Select {name}",
  "wf.toggleStatus": "Toggle status for {name}",
  "wf.on": "Aktif",
  "wf.off": "Nonaktif",
  "wf.openTitle": "Open workflow",
  "wf.import": "Import",
  "wf.newFolder": "New folder",
  "wf.newWorkflow": "New workflow",
  "wf.soon": "Coming soon",
  "wf.range": "Showing {from}–{to} of {total}",
  "wf.clearSearch": "Clear search",
  "wf.showing": "Showing {shown} of {total} workflows",
  "wf.refresh": "Refresh",
  "wf.loading": "Loading...",
  "wf.dismissError": "Dismiss error",
  "wf.loadingTitle": "Loading workflows",
  "wf.loadingDescription": "Fetching data from your workspace.",
  "wf.noMatch": "No matching workflows",
  "wf.workspaceReady": "Your workspace is ready",
  "wf.noMatchDescription": "Try a different name or description keyword.",
  "wf.workspaceReadyDescription":
    "Create your first workflow to start building automation.",
  "wf.createShort": "Create workflow",
  "wf.noDescription": "No description yet.",
  "wf.nodeCount": "{count} nodes",
  "wf.updated": "Updated {date}",
  "wf.status.draft": "Draft",
  "wf.status.active": "Active",
  "wf.editAria": "Edit {name}",
  "wf.deleteAria": "Delete {name}",
  "wf.editTitle": "Edit workflow",
  "wf.deleteTitle": "Delete workflow",
  "wf.pageOf": "Page {page} of {last}",
  "wf.previous": "Previous",
  "wf.next": "Next",
  "wf.errorLoad": "Workflows failed to load. Check the API connection.",
  "wf.errorCreate": "Workflow failed to create. Check the API connection.",
  "wf.errorDelete": "Workflow failed to delete. Try again.",
  "wf.errorSave": "Workflow changes failed to save. Try again.",
  "wf.saveSuccess": "Workflow saved successfully.",
  "wf.back": "Back to workflow list",
  "wf.editEyebrow": "Edit workflow",
  "wf.editHeading": "Update workflow details",
  "wf.editDescription": "Save changes before opening the workflow canvas.",
  "wf.nameLabel": "Workflow name",
  "wf.descriptionLabel": "Description",
  "wf.optional": "(optional)",
  "wf.descriptionPlaceholder": "Describe what this workflow does",
  "wf.statusLabel": "Status",
  "wf.statusHint":
    "Draft is not active for automation. Active marks the workflow as ready to use.",
  "wf.saving": "Saving...",
  "wf.saveChanges": "Save changes",
  "wf.openCanvas": "Open canvas",
  "wf.newAutomation": "New automation",
  "wf.createTitle": "Create workflow",
  "wf.createDescription": "Name the workflow and add a short description.",
  "wf.createPlaceholder": "Example: Customer Support Flow",
  "wf.createDescriptionPlaceholder":
    "What should this workflow automate?",
  "wf.creating": "Creating...",
  "wf.deleteQuestion": "Delete workflow?",
  "wf.deleteDescription":
    "{name} and its saved node configuration will be permanently deleted.",
  "wf.deleting": "Deleting...",
  "wf.deleteAction": "Delete workflow",
  "wf.deleteSelected": "Delete {count}",
  "wf.deleteSelectedTitle": "Delete selected workflows?",
  "wf.deleteSelectedDesc": "{count} workflows will be permanently deleted.",

  "dashboard.title": "DASHBOARD",
  "dashboard.subtitle": "",
  "dashboard.refresh": "Refresh",
  "dashboard.exportPDF": "Export PDF",
  "dashboard.costHint": "Estimated monthly cost based on connected model",
  "dashboard.activeConversations": "Active today",
  "dashboard.activeConversationsHint": "Active conversations today",
  "dashboard.costProjection": "Cost projection",
  "dashboard.costProjectionHint": "Estimated monthly cost",
  "dashboard.topWorkflows": "Top workflows",
  "dashboard.topWorkflowsHint": "Based on token consumption",
  "dashboard.workflowColumn": "Workflow",
  "dashboard.tokensColumn": "Tokens",
  "dashboard.runsColumn": "Runs",
  "dashboard.errorRateColumn": "Error Rate",
  "dashboard.avgTimeColumn": "Avg Response Time",
  "dashboard.modelDistribution": "Model Distribution",
  "dashboard.tokenTrend": "Token Trend",
  "dashboard.noModel": "No model connected",
  "dashboard.dailyExecutions": "Daily executions (last 7 days)",
  "dashboard.viewAudit": "View audit log",
  "dashboard.retry": "Try again",
  "dashboard.tokenUsageError":
    "Token statistics failed to load. Check the connection to the Orqiva service.",
  "dashboard.errorLoad":
    "Some dashboard data failed to load. Check the API connection.",
  "dashboard.totalWorkflows": "Total workflows",
  "dashboard.allFlows": "All flows in the workspace",
  "dashboard.active": "Active",
  "dashboard.readyPercent": "{percent}% ready to run",
  "dashboard.noWorkflows": "No workflows yet",
  "dashboard.draft": "Inactive",
  "dashboard.inactiveWorkflows": "Inactive workflows",
  "dashboard.estimatedCost": "Estimated cost",
  "dashboard.reviewBeforeActive": "Review before activating",
  "dashboard.totalTokens": "Total tokens",
  "dashboard.executions": "Executions",
  "dashboard.runInPeriod": "Executed in this period",
  "dashboard.avgTokens": "Average tokens",
  "dashboard.perExecution": "Per execution",
  "dashboard.successRate": "Success rate",
  "dashboard.successOfTotal": "{success} successful out of {total}",
  "dashboard.thisPeriod": "This {period}",
  "dashboard.period.daily": "Daily",
  "dashboard.period.monthly": "Monthly",
  "dashboard.period.yearly": "Yearly",
  "dashboard.tokenUsage": "Token usage",
  "dashboard.tokenUsageDescription":
    "Input and output token distribution for AI Agent nodes.",
  "dashboard.input": "Input",
  "dashboard.output": "Output",
  "dashboard.chartAria": "Token usage chart",
  "dashboard.executionResults": "Execution results",
  "dashboard.executionResultsDescription":
    "Status composition across all history.",
  "dashboard.recentExecutions": "Recent executions",
  "dashboard.recentDescription":
    "The last eight sessions across all workflows.",
  "dashboard.all": "All",
  "dashboard.noSessions": "No sessions yet",
  "dashboard.noSessionsDescription":
    "Start a conversation through the Channel widget to see audit logs here.",
  "dashboard.executionHash": "Execution #{id}",
  "dashboard.workflowFallback": "Workflow #{id}",
  "dashboard.needsAttention": "Needs attention",
  "dashboard.attentionDescription": "Signals worth reviewing.",
  "dashboard.failedExecutions": "Failed executions",
  "dashboard.checkLogs": "Check logs and node configuration",
  "dashboard.waitingMessages": "Waiting for messages",
  "dashboard.waitingMessagesHint":
    "Workflows waiting for the next customer message",
  "dashboard.draftWorkflows": "Draft workflows",
  "dashboard.notActivated": "Not activated for automation",
  "dashboard.avgNodes": "Average nodes",
  "dashboard.perWorkflow": "Per workflow",
  "dashboard.systemStatus": "System status",
  "dashboard.tokenTracking": "Token tracking",
  "dashboard.awaitingData": "Awaiting data",
  "dashboard.timezone": "Time zone",
  "dashboard.freeModels": "Free AI models",
  "dashboard.freeModelsDescription":
    "$0 model options from OpenRouter for prototypes and light production.",
  "dashboard.docs": "Documentation",
  "dashboard.freeCollection": "Free collection",
  "dashboard.emptyTokens": "No tokens recorded yet",
  "dashboard.emptyTokensDescription":
    "Tokens will be counted automatically whenever an AI Agent runs.",
  "dashboard.pipelineTitle": "Automation flow",
  "dashboard.pipelineTrigger": "Trigger",
  "dashboard.pipelineIncoming": "Incoming message",
  "dashboard.pipelineAI": "AI Agent",
  "dashboard.pipelineAIHint": "Flexible model",
  "dashboard.pipelineReply": "Reply",
  "dashboard.pipelineSend": "Send Message",
  "dashboard.tokenTooltip":
    "{label} · {tokens} tokens · {executions} executions",
  "dashboard.status.success": "Successful",
  "dashboard.status.failed": "Failed",
  "dashboard.status.waiting": "Waiting",
  "dashboard.status.running": "Running",
  "dashboard.status.escalated": "Escalated",
  "dashboard.successShort": "successful",

  "ai.provider.gemini": "Fast, multimodal models from Google for customer conversations.",
  "ai.provider.openai": "GPT models for reasoning, writing, and decision making.",
  "ai.provider.openrouter": "One API key for models from many different providers.",
  "ai.eyebrow": "Preferences",
  "ai.subtitle":
    "Connect your own AI models. Saved keys are used by workflows immediately without editing environment files.",
  "ai.connectedCount": "{count} providers connected",
  "ai.noneConnected": "No providers connected",
  "ai.errorLoad": "AI settings failed to load. Try again.",
  "ai.errorDetect": "Models could not be detected.",
  "ai.errorSave": "API key failed to save.",
  "ai.errorDelete": "API key failed to delete.",
  "ai.errorPrefs": "Reply preferences failed to save.",
  "ai.catalogTitle": "Available providers",
  "ai.catalogDescription": "Select a provider card to add or replace its API key.",
  "ai.catalogCount": "{active} active · {unset} not configured",
  "ai.cardConnected": "Connected",
  "ai.cardNotConfigured": "Not configured",
  "ai.modelNotChosen": "No model selected",
  "ai.modelsAvailable": "{count} models available",
  "ai.keyNotSaved": "API key not saved",
  "ai.configure": "Configure",
  "ai.configureAria": "Configure API key for {name}",
  "ai.prefTitle": "AI reply preferences",
  "ai.prefDescription": "Set the delay before AI processes newly received messages.",
  "ai.debounceLabel": "Reply debounce",
  "ai.debounceHint": "0 ms means AI replies immediately. Maximum 5 seconds.",
  "ai.savePrefs": "Save preferences",
  "ai.prefSaved": "AI reply preferences saved.",
  "ai.secureTitle": "Secure and immediately active",
  "ai.secure1": "API keys are stored encrypted in the database.",
  "ai.secure2": "Keys are never sent back to the browser.",
  "ai.secure3": "Changes take effect the next time a workflow runs.",
  "ai.dialogDescription": "Save an API key to enable this provider in workflows.",
  "ai.providerFallback": "AI provider",
  "ai.keyConfigured": "API key is saved. {count} models detected.",
  "ai.providerNoKey": "This provider does not have an API key yet.",
  "ai.apiKeyLabel": "API key",
  "ai.keyPlaceholderExisting": "Already saved. Enter a value to replace it.",
  "ai.keyPlaceholderNew": "Enter the {name} API key",
  "ai.keyHint": "The key is stored encrypted and never displayed again.",
  "ai.defaultModel": "Default model",
  "ai.detecting": "Detecting...",
  "ai.detectModels": "Detect models",
  "ai.detectFirst": "Detect models first",
  "ai.modelsAvailableCount": "{count} models available for this provider.",
  "ai.detectHint": "Save the key to detect models automatically.",
  "ai.getKey": "How to get an API key for {name}",
  "ai.deleteKey": "Delete key",
  "ai.deleteConfirm":
    "Delete the {name} API key? AI Agent nodes using this provider cannot run until a key is added again.",
  "ai.saveKey": "Save API key",
  "ai.keySaved": "{name} API key saved.",
  "ai.keyDeleted": "{name} API key deleted.",
  "ai.keyRequired": "Enter an API key first.",
  "ai.keyRequiredProvider": "An API key is required for this provider.",

  "channel.widgetSnippet": "Widget embed snippet",
  "channel.widgetSnippetDescription":
    "Paste this snippet before the closing </body> tag on your website.",
  "channel.copySnippet": "Copy snippet",
  "channel.snippetCopied": "Snippet copied.",
  "help.onThisPage": "On this page",
  "help.noResults": "No sections match your search.",
  "public.customerService": "Customer Service",
  "public.welcomeFallback": "How can we help?",
  "public.startChat": "Start chat",
  "public.opening": "Opening chat…",
  "public.closeChat": "Close chat",
  "public.online": "online",
  "public.operatorHandling": "replying…",
  "public.typing": "typing…",
  "public.today": "Today",
  "public.yesterday": "Yesterday",
  "public.inputPlaceholder": "Type a message",
  "public.messageLabel": "Message",
  "public.send": "Send message",
  "public.endedNote":
    "This conversation has ended. Reload to start again.",
  "public.unavailableMessage": "Chat is not available right now.",
  "public.startError": "The chat could not be opened. Try reloading the page.",
  "public.sendError": "The message could not be sent. Try again.",
};

interface PreferencesContextValue {
  language: Language;
  t: (key: string, params?: TranslationParams) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

  const t = useCallback((key: string, params?: TranslationParams) => {
    let value = EN[key] ?? key;

    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
    }

    return value;
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({ language: "en", t }),
    [t],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);

  if (context === null) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }

  return context;
}

export function useI18n() {
  const { language, t } = usePreferences();
  return { language, t };
}

export function formatLocale(_language: Language): string {
  return "en-US";
}
