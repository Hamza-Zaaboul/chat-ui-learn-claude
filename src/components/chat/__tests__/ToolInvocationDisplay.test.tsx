import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ToolInvocationDisplay,
  getToolInvocationLabel,
} from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

function inv(
  toolName: string,
  args: Record<string, unknown>,
  state: string,
  result?: unknown
): any {
  return {
    toolCallId: "t1",
    toolName,
    args,
    state,
    ...(result !== undefined ? { result } : {}),
  };
}

// ---------- helper: getToolInvocationLabel ----------

test("create completed → 'Created App.jsx'", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "str_replace_editor",
        { command: "create", path: "/App.jsx", file_text: "x" },
        "result",
        "ok"
      )
    )
  ).toBe("Created App.jsx");
});

test("create in progress → 'Creating App.jsx'", () => {
  expect(
    getToolInvocationLabel(
      inv("str_replace_editor", { command: "create", path: "/App.jsx" }, "call")
    )
  ).toBe("Creating App.jsx");
});

test("create partial-call state → still in-progress", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "partial-call"
      )
    )
  ).toBe("Creating App.jsx");
});

test("str_replace completed → 'Edited styles.css'", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "str_replace_editor",
        { command: "str_replace", path: "/styles.css" },
        "result",
        "ok"
      )
    )
  ).toBe("Edited styles.css");
});

test("str_replace in progress → 'Editing styles.css'", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "str_replace_editor",
        { command: "str_replace", path: "/styles.css" },
        "call"
      )
    )
  ).toBe("Editing styles.css");
});

test("insert completed → 'Edited styles.css' (shares verb with str_replace)", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "str_replace_editor",
        { command: "insert", path: "/styles.css" },
        "result",
        "ok"
      )
    )
  ).toBe("Edited styles.css");
});

test("view completed → 'Viewed App.jsx'", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "str_replace_editor",
        { command: "view", path: "/App.jsx" },
        "result",
        "ok"
      )
    )
  ).toBe("Viewed App.jsx");
});

test("undo_edit completed → 'Reverted App.jsx'", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "str_replace_editor",
        { command: "undo_edit", path: "/App.jsx" },
        "result",
        "ok"
      )
    )
  ).toBe("Reverted App.jsx");
});

test("nested path uses basename only", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "str_replace_editor",
        { command: "create", path: "/src/components/App.jsx" },
        "result",
        "ok"
      )
    )
  ).toBe("Created App.jsx");
});

test("rename completed with both paths → 'Renamed a.tsx to b.tsx'", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "file_manager",
        { command: "rename", path: "/a.tsx", new_path: "/b.tsx" },
        "result",
        "ok"
      )
    )
  ).toBe("Renamed a.tsx to b.tsx");
});

test("rename in progress with both paths → 'Renaming a.tsx to b.tsx'", () => {
  expect(
    getToolInvocationLabel(
      inv(
        "file_manager",
        { command: "rename", path: "/a.tsx", new_path: "/b.tsx" },
        "call"
      )
    )
  ).toBe("Renaming a.tsx to b.tsx");
});

test("rename completed without new_path degrades to single-path form", () => {
  expect(
    getToolInvocationLabel(
      inv("file_manager", { command: "rename", path: "/a.tsx" }, "result", "ok")
    )
  ).toBe("Renamed a.tsx");
});

test("delete completed → 'Deleted foo.js'", () => {
  expect(
    getToolInvocationLabel(
      inv("file_manager", { command: "delete", path: "/foo.js" }, "result", "ok")
    )
  ).toBe("Deleted foo.js");
});

test("delete in progress → 'Deleting foo.js'", () => {
  expect(
    getToolInvocationLabel(
      inv("file_manager", { command: "delete", path: "/foo.js" }, "call")
    )
  ).toBe("Deleting foo.js");
});

test("unknown toolName returns raw name verbatim", () => {
  expect(
    getToolInvocationLabel(inv("mystery_tool", { command: "create" }, "result"))
  ).toBe("mystery_tool");
});

test("known tool with missing command → raw toolName", () => {
  expect(
    getToolInvocationLabel(inv("str_replace_editor", {}, "partial-call"))
  ).toBe("str_replace_editor");
});

test("known str_replace_editor + command, missing path → 'Creating file'", () => {
  expect(
    getToolInvocationLabel(
      inv("str_replace_editor", { command: "create" }, "call")
    )
  ).toBe("Creating file");
});

test("known str_replace_editor + str_replace, missing path → 'Editing file'", () => {
  expect(
    getToolInvocationLabel(
      inv("str_replace_editor", { command: "str_replace" }, "call")
    )
  ).toBe("Editing file");
});

test("file_manager + delete, missing path → 'Deleting file'", () => {
  expect(
    getToolInvocationLabel(inv("file_manager", { command: "delete" }, "call"))
  ).toBe("Deleting file");
});

test("file_manager + rename, missing path → 'Renaming file'", () => {
  expect(
    getToolInvocationLabel(inv("file_manager", { command: "rename" }, "call"))
  ).toBe("Renaming file");
});

test("str_replace_editor with empty args → raw toolName", () => {
  expect(
    getToolInvocationLabel(inv("str_replace_editor", {}, "call"))
  ).toBe("str_replace_editor");
});

// ---------- component: ToolInvocationDisplay ----------

test("renders the friendly label computed by the helper", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={inv(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "result",
        "ok"
      )}
    />
  );
  expect(screen.getByText("Created App.jsx")).toBeDefined();
});

test("renders emerald dot (no spinner) when complete", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={inv(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "result",
        "ok"
      )}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("renders spinner when state is 'call'", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={inv(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "call"
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("renders spinner when state is 'partial-call'", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={inv(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "partial-call"
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("renders spinner when state is 'result' but result is falsy", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={inv(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "result"
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("preserves chip styling classes", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={inv(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "result",
        "ok"
      )}
    />
  );
  const chip = container.firstElementChild;
  expect(chip?.className).toContain("inline-flex");
  expect(chip?.className).toContain("font-mono");
  expect(chip?.className).toContain("bg-neutral-50");
  expect(chip?.className).toContain("rounded-lg");
  expect(chip?.className).toContain("border");
});
