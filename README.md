```text
          .-""""-.
        .'  o  o '.
       /     ^     \
      |   .------. |
      |  /|      |\ |
      |   | .jpg |  |   nom
      |   |      |  |
       \  '------' /
        '.       .'
          '-....-'
```

`image-blaster` is a harness for creating derivative assets from images.

## Quickstart

1. Open a Terminal, enter `git clone https://github.com/neilsonnn/image-blaster`
2. Enter the directory with `cd image-blaster`
3. Run `claude` (install with `curl -fsSL https://claude.ai/install.sh | bash`)
4. Say hello to Claude, and give them your API key for World Labs and FAL
5. Put an image into `input/` and ask Claude to `IMAGE-BLAST` it.

## Description

From your input image, `image-blaster` will create 3D models and environment, ambient sounds, object specific sfx, and lighting.

Video game level concepts? `IMAGE-BLAST` it.
Your childhood bedroom? `IMAGE-BLAST` it.
A film location scout? `IMAGE-BLAST` it.
An architectural rendering? `IMAGE-BLAST` it.
A photograph of your favourite coordinate on earth? `IMAGE-BLAST` it.

## Advanced

IMAGE-BLASTER uses a few generation models:

- `marble-1.1` - World Labs Marble model creates the explorable environment.
- `nano-banana` - default image edit preference for source cleanup, clean plates, and object reference images.
- `gpt-image-2` - alternate image edit provider when the edit skill is asked to prefer it.
- `hunyuan-3d` - Hunyuan 3D model creates 3D object models through FAL.
- `elevenlabs-sfx` - ElevenLabs sound effects model creates ambient and object-specific sounds.

3D model creation supports these Hunyuan parameters:

- `--face-count <40000-1500000>`: target face count. IMAGE-BLASTER defaults to `50000`; Hunyuan's API default is `500000`.
- `--enable-pbr true|false`: enable PBR material generation. Defaults to `true`.
- `--generate-type Normal|LowPoly|Geometry`: `Normal` creates a textured model, `LowPoly` applies polygon reduction, and `Geometry` creates a white geometry-only model. Defaults to `Normal`.
