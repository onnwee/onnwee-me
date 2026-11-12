---
name: subarchy
summary: "An Arch Linux desktop distribution: Hyprland with its own desktop shell, lock screen and theme, managed through one command."
stack: Go, QML, Shell
state: in development, no release yet
status: "boots in a VM"
order: 12
repo: https://github.com/subculture-collective/subarchy
---

It is built from scratch, borrowing from Omarchy where that fits. The installer asks for a disk, a name and a passphrase, shows what is on each disk and asks before it wipes one. The installed system has an encrypted root, snapshots you can boot back into, and a factory-reset snapshot.

The live image builds, boots in a virtual machine and installs there. It has not been tested on real hardware yet.
