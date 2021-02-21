# Factorio Ambience Generator

A music generator for Factorio. Creates a bunch of mods, dynamically, from a
source folder of music files and a few command line args. I got sick of the
default Factorio music but I liked having random, game-specific music instead of
finding something myself on Spotify. So I took a bunch of free audio files,
converted them to ogg, and wrote this app to create mods with the music. Useful
for anyone looking to create some mods for themselves.

## :sparkles: Usage

**Quick usage:**

```commandline
node index -f 1.1 -n 'Name of Mod'
```

At minimum, it needs a Factorio version to target, and the name to use for the
mod itself. Optionally, there's a ton more you can provide to customize the
output to your heart's desire. Here's the full list of args, always accessible
with the `-h` flag.

```commandline
Usage: node index [options] [flags]

Options:

    --help, -h                          displays help information
    --modName, -n                       the name of the mod itself
    --modVersion <version>, -m          version of the base mod itself (defaults to 1.0.0)
    --factorioVersion, -f               version of Factorio to target with the mods
    --chunkSize <value>, --size, -c     the number of audio files to include in one mod (defaults to 20)
    --source <folder>, -s               the location of the source files (defaults to ./music)
    --destination <folder>, -d          the location of the destination mods (defaults to ./generatedMods)
    --fileType <extension>, -t          the file type to use as music (defaults to ogg)
    --author <name>                     your name to add as the author of the mods (defaults to Anonymous)
    --contact <email>                   your contact info for inclusion in the mods (defaults to N/A)
    --clear                             ALL DESTINATION FOLDER CONTENTS WILL BE DELETED. NO CONFIRMATION.
```

### Best usage

If you're developing locally, the command to use is:

```
node index -f 1.1 -n 'Mod Name' -d '~/Library/Application Support/factorio/mods' --author 'Your Name' --contact 'your@email.com'
```

This will build the mods directly into the mod folder on a Mac, no copying later
needed. Just don't use `--clear` with that, otherwise it'll delete all your
mods. If you want to experiment with other file types, just use `-t` to change
which type of file it's looking for. `-c` allows for packaging smaller or larger
groups of files into one mod. For local use, you can provide a huge number to
have it compressed into one mod.

### Mod Portal

It'll create a set of mods like this, split up for easier uploading/downloading
if you decide to submit it to the Factorio Mod Portal. There will be one main
"orchestrator" mod, and a bunch of file-only music mods. You even get a fancy
thumbnail image!

![Mod portal](https://user-images.githubusercontent.com/982182/108618717-2fac9580-73d5-11eb-89c6-52cfe5484e87.png)

## :hammer: Behind the scenes

It's a `yarn` project, with decently minimal dependencies (Vercel's arg parser,
a JSON -> Lua converter, canvas, and the excellent ADM Zip are the real
requirements, and cli-progress allows easy understanding of the ~ minute long
process with 200 files). The files are split up in the `source` folder for a bit
better organization (though it could use some work). Feel free to use it, take
it, change it, and let's have fun playing Factorio with more music!
