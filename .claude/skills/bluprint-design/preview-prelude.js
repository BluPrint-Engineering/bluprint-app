(() => {
	window.__bluprintCompile = (params, body) => {
		const errors = [];
		const record = (event) => {
			errors.push(event.error ?? new Error(event.message));
			event.preventDefault();
		};
		const script = document.createElement("script");
		script.textContent = `window.__bluprintFactory=function(${params.join(",")}){\n${body}\n}`;
		window.addEventListener("error", record);
		try {
			document.head.appendChild(script);
		} finally {
			script.remove();
			window.removeEventListener("error", record);
		}
		const factory = window.__bluprintFactory;
		delete window.__bluprintFactory;
		if (errors.length) throw errors[0];
		if (typeof factory !== "function")
			throw new Error("Preview could not compile prototype code");
		return factory;
	};

	for (const node of document.querySelectorAll("script[data-encoded-logic]")) {
		node.textContent = new TextDecoder().decode(
			Uint8Array.from(atob(node.getAttribute("data-encoded-logic")), (c) =>
				c.charCodeAt(0),
			),
		);
		node.removeAttribute("data-encoded-logic");
	}

	for (const name of ["localStorage", "sessionStorage"]) {
		try {
			window[name].getItem("");
		} catch {
			const data = new Map();
			const storage = {
				get length() {
					return data.size;
				},
				key: (index) => [...data.keys()][index] ?? null,
				getItem: (key) => data.get(String(key)) ?? null,
				setItem: (key, value) => {
					data.set(String(key), String(value));
				},
				removeItem: (key) => {
					data.delete(String(key));
				},
				clear: () => data.clear(),
			};
			Object.defineProperty(window, name, {
				value: storage,
				configurable: true,
			});
		}
	}

	const isSubmitter = (element) =>
		(element instanceof HTMLButtonElement && element.type === "submit") ||
		(element instanceof HTMLInputElement &&
			(element.type === "submit" || element.type === "image"));
	const blocksImplicitSubmission = new Set([
		"text",
		"search",
		"url",
		"tel",
		"email",
		"password",
		"date",
		"month",
		"week",
		"time",
		"datetime-local",
		"number",
	]);
	const submit = (form, submitter) =>
		form.dispatchEvent(
			new SubmitEvent("submit", {
				bubbles: true,
				cancelable: true,
				submitter,
			}),
		);
	window.addEventListener("click", (event) => {
		if (event.defaultPrevented || !(event.target instanceof Element)) return;
		const submitter = event.target.closest("button,input");
		if (!submitter || !isSubmitter(submitter) || !submitter.form) return;
		event.preventDefault();
		if (!submitter.disabled) submit(submitter.form, submitter);
	});
	window.addEventListener("keydown", (event) => {
		const field = event.target;
		if (
			event.defaultPrevented ||
			event.key !== "Enter" ||
			event.isComposing ||
			event.ctrlKey ||
			event.altKey ||
			event.metaKey ||
			!(field instanceof HTMLInputElement) ||
			!blocksImplicitSubmission.has(field.type) ||
			!field.form
		)
			return;
		const form = field.form;
		const controls = [...form.elements];
		const defaultButton = controls.find(isSubmitter);
		event.preventDefault();
		if (defaultButton) {
			if (!defaultButton.disabled) defaultButton.click();
		} else if (
			controls.filter(
				(control) =>
					control instanceof HTMLInputElement &&
					blocksImplicitSubmission.has(control.type),
			).length === 1
		)
			submit(form, null);
	});
})();
