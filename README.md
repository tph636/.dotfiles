# Dotfiles

Dotfiles managed using stow.
Each package directory in this repo must mirror the structure of the home directory.

## Installs

- `stow` (https://www.gnu.org/software/stow/manual/stow.html)
- `fzf`
- `nvim`


## Usage

To apply dotfiles, run the following from inside the `dotfiles` directory:
```bash
stow --adopt .
```

environment variables in ~/.env as `"export envar="abc""`
