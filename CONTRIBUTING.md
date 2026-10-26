# Contributing

Thanks for helping to improve the InPost node for n8n.

## Report a bug or suggest an idea

Open an issue: https://github.com/werawolosz/n8n-nodes-inpost-global/issues/new/choose

Choose **Bug report** when something does not work, or **Feature request** for a new operation, field or improvement. Never paste your client ID, client secret, access tokens or customer data.

## Change the code

1. Fork the repository and create a branch from `main`.
2. Install Node.js 24 and run `npm install`.
3. Read `SPEC-INPOST.md` (API map and node design) and `AGENTS.md` (n8n node rules).
4. Make your change. The node uses the declarative style: `requestDefaults` and `routing`, no `execute()` method, and no runtime dependencies.
5. Run `npm run lint` and `npm run build`. Both must pass.
6. Try it with `npm run dev` (local n8n at http://localhost:5678), ideally against the InPost stage environment.
7. Update the README when you add or change an operation.
8. Open a pull request that explains what changed and how you tested it.

All texts in the node and the README are in English, as n8n verification requires.

## License

By contributing, you agree that your contributions are licensed under the MIT License of this project.
