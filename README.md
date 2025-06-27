# Dotfiles

Dotfiles managed using stow.
Each package directory in this repo must mirror the structure of the home directory.

## Requirements

- Stow (https://www.gnu.org/software/stow/manual/stow.html)
- Optional: `zsh`
- Optional: `fzf`


## Usage

To apply dotfiles, run the following from inside the `dotfiles` directory:
```bash
stow --adopt .
