# Enigma Simulator

A visual simulator for the [Enigma machine][] used by the German military during
World War II.

## Background

This simulates the [Enigma M3][M3] used by the Navy. The Army and Air Force used
the [Enigma I][I] which was functionally equivalent but used numbers on the
wheels instead of letters.

See the Useful Links below for much more information about the Enigma.

## Operation

The form in the upper left allows you to configure the machine. See next section
for details.

The machine itself is laid out similarly to a real machine. Starting in the
middle-left and going counter-clockwise:

*   **Keyboard** (black, middle-left): This is where users type their messages.
    Each keypress causes the rotor assembly to step and then an electrical
    signal, represented by a bold line, to go down to the plugboard.

    Usage: Click a letter to encipher it.

*   **Plugboard** (bottom-left): Swaps letters in transit between the
    keyboard/display and the rotor assembly. On the physical machine, this was
    configured by connecting wires between pairs of letters.

    Usage: Drag the little box to connect letters.

*   **Rotor Assembly** (right): Represents the three rotors (right, middle,
    left) and reflector plate as concentric circles, as though looking through
    the right side. Each rotor contains:

    *   Ring: The letters around the outside of the rotor.
    *   Notch: The letter (or letters) in red that indicate a "notch" position
        on the ring. When this letter in shown in the indicator, the next key
        press will cause this rotor to the left to step. See "Things to try" for
        more info.
    *   Wires: The wires inside the rotor, connecting the outside and inside.
    *   Window: Showing the indicator setting for that rotor.
    *   Ring setting: A dot on the "A" wire showing the ring setting.

    As the signal passes through the rotor assembly, it goes through the right,
    middle, and left rotors, through the reflector, back through the left,
    middle, and right rotors, and out to the plugboard again.

    Usage: If **locked** checked (the default), drag a rotor to change the
    indicator setting. If **locked** is unchecked, drag the wires or the ring to
    change the ring setting.

*   **Display** (grey, upper-left): Lights up showing the output.

    Usage: When a key is pressed on the keyboard, the corresponding ciphertext
    letter will light up on the display.

## Configuration

The form in the upper left allows you to quickly change settings.

*   **Rotor Order:** Chooses the order of the rotors, separated by hyphens.
    There are eight rotors, `I` through `VIII`. The choice of rotor decides the
    wiring of that rotor. Example: `II-I-V`.

*   **Ring Setting:** Specifies the "ring setting" of each rotor, which controls
    the relation between the wiring and the letter shown in the indicator.
    Example: `ONW`.

*   **Indicator:** Sets the rotation of each rotor. Each time you press the
    keyboard, this will step once. Example: `MVX`.

*   **Plugboard:** Sets the pair of letters that should be swapped, separated by
    spaces. Example: `AM BP NO`.

*   **Locked:** Indicates whether the ring is "locked" to the wires. If true,
    dragging the rotor rotates the entire rotor, without changing the ring
    setting; this can be used to change the indicator. If false, dragging the
    rotor only rotates the wires or ring, which changes the ring setting (and
    the indicator, if you dragged the ring).

## Things to try

*   Press a key and trace the bold wires through the machine.

*   Press the same key over and over again to see the impact of the rotor
    stepping on the wires.

*   Press keys repeatedly and take note of how the rotors step. It's like an
    odometer, where the rollover point is when the letter in the window is red,
    called a "notch" position.  For example, with Rotor Order `I-II-III`, the
    stepping is `AAU`, `AAV`, `ABW` because `V` is red in the right rotor.

*   Experience the "double stepping" behavior. Set the middle rotor and right
    rotor so that they are both one away from a notch position then press the
    key a few times. Note how the middle rotor always steps whenever it's on a
    notch position. For example, with Rotor Order `I-II-III`, the stepping is
    `ADU`, `ADV`, `AEW`, `AFX` because `E` is red in the middle rotor.

*   Try setting the middle rotor to a notch position even if the right rotor is
    nowhere near it. What happens?

*   Try changing the ring setting. How does that affect stepping and
    encipherment?

*   Try changing the plugboard.

*   Try changing the rotor order.

## Useful Links

*   [Crypto Museum](https://www.cryptomuseum.com/crypto/enigma/index.htm):
    General resource about the machines.
    explanation of the procedure and attacks.
*   [Ellsbury](http://www.ellsbury.com/enigmabombe.htm): Explanation of the
    Bombe cryptanalytic attack.
*   [1940 Enigma General Procedures](http://www.codesandciphers.org.uk/documents/egenproc/page24.htm),
    page 24: Rules by which the Germans used the machines.
*   [Matematik Sider](https://www.matematiksider.dk/enigma_eng.html): Well
    written summary of the Enigma.

## License

Copyright Mark Lodato, 2019. Released under the [MIT License](LICENSE).

[Enigma machine]: https://en.wikipedia.org/wiki/Enigma_machine
[I]: https://www.cryptomuseum.com/crypto/enigma/i/index.htm
[M3]: https://www.cryptomuseum.com/crypto/enigma/m3/index.htm
[M4]: https://www.cryptomuseum.com/crypto/enigma/m4/index.htm
