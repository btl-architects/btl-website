# btl architects — content studio

This is where the practice edits the website. Nothing on the site is hard-coded:
projects, people, press, categories, navigation and contact details all live
here, and the site rebuilds itself when something is published.

## What still needs an account

I can't create accounts, so this one step is yours. It takes about two minutes
and is the only thing standing between here and a working backend.

```bash
cd studio && npx sanity login
```

Then create the project — this writes the project ID into `.env` for you:

```bash
cd studio && npx sanity init --create-project "btl architects" --dataset production --env
```

**Register it to btl architects, not to a personal account.** The implementation
contract is explicit that the studio owns its own infrastructure — the practice
must be able to change developers without changing CMS.

Afterwards, run the studio locally:

```bash
cd studio && npm run dev
```

## Moving the existing content in

Once the project exists, the prototype's content — four projects, six people,
the AD feature, all 155 photographs — goes in with one command. It needs a write
token, which you create at **sanity.io/manage → API → Tokens** with *Editor*
permission, then put in `studio/.env` as `SANITY_WRITE_TOKEN=…`.

```bash
cd studio && node migrate.mjs
```

It is safe to run twice: documents are addressed by a stable id derived from the
slug, so a second run updates rather than duplicates.

## What the editor can and cannot do

This is the part that matters in a year's time.

**Can:** add, reorder, retire and publish projects; write and edit any text;
upload photographs and mark what each one is *of*; add people and move them
between principal, team and alumni; record press and awards; change navigation,
categories and contact details.

**Cannot:** set alignment, column spans, band heights or any other layout value.
There is no such field anywhere in these schemas, deliberately. Content states
facts and the interface derives the arrangement — that is what stops the site
drifting away from its own design once the person who designed it has moved on.

Three rules are enforced rather than documented, because documentation does not
survive a busy week:

| Rule | Enforced by |
|---|---|
| Every photograph has alt text | `figure.alt` is required, 8–160 characters |
| Every photograph has a licence | `figure.rights` is required — this is what stops a Condé Nast image being reused by accident |
| Exactly one cover per project | Custom validation on `project.images` |

## Things that appear by themselves

Nobody has to remember to switch these on.

- **The category filter bar** shows up when two categories each hold three
  published projects. Below that the index is simply all the work, which at four
  projects is the right answer anyway.
- **A category** appears once it has published work in it, and not before, so
  `commercial` can be created today and waits until next year without showing
  anyone an empty page.
- **The team list** on People appears when there are real names to put in it.
- **Press entries** join the wall as they are added; a missing masthead falls
  back to the publication's name set at display scale, which is a designed
  state, not a broken one.
