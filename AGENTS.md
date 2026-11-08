<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Profile avatar outlines use persisted palette keys from `src/lib/profile-colors.ts` and semantic CSS tokens, so personal and public profiles share the same selection.
- Shared dialogs constrain height to the dynamic viewport and scroll internally; mobile shell spacing includes device safe areas to keep controls reachable without a keyboard.
