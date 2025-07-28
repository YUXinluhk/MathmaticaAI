# MVP Benchmark: Cantilever Beam Deflection

## 1. Problem Description

A cantilever beam of length L, with a constant Young's modulus E and moment of inertia I, is subjected to a concentrated downward force F at its free end.

## 2. Governing Differential Equation and Boundary Conditions

The deflection of the beam, w(x), is governed by the Euler-Bernoulli beam theory, which gives the following fourth-order ordinary differential equation:

```
d^4w/dx^4 = 0
```

The boundary conditions for a cantilever beam are:
- At the fixed end (x=0):
    - `w(0) = 0` (zero deflection)
    - `dw/dx(0) = 0` (zero slope)
- At the free end (x=L):
    - `d^2w/dx^2(L) = 0` (zero bending moment)
    - `d^3w/dx^3(L) = -F/(EI)` (shear force equals the applied load)

## 3. Analytical Solution

The exact analytical solution for the deflection w(x) along the beam is:

```
w(x) = (F * x^2) / (6 * E * I) * (3 * L - x)
```

## 4. Expected Deflection Curve Plot

**Parameters:**
- L = 10 m
- E = 210 GPa = 210e9 Pa
- I = 1e-5 m^4
- F = 1000 N

**Python/Matplotlib Description:**
The plot will be a 2D line graph with the x-axis representing the position along the beam (from 0 to L) and the y-axis representing the deflection w(x). The curve will start at (0,0) with a zero slope, and will curve downwards, with the maximum deflection occurring at the free end (x=L). The shape of the curve will be a cubic function of x. The y-axis should be labeled "Deflection (m)" and the x-axis should be labeled "Position along beam (m)". The title of the plot should be "Deflection of a Cantilever Beam". The curve should be plotted for x values from 0 to 10, and the corresponding w(x) values should be calculated using the analytical solution with the given parameters. The maximum deflection at x=10 should be approximately -0.00158 meters.
