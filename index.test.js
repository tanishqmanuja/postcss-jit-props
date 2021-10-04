const postcss = require('postcss')
const plugin = require('./')

const MockProps = {
  '--red': '#f00',
  '--pink': '#ffc0cb',
  '--h': 200,
  '--s': '50%',
  '--l': '50%',
  '--size-1': '1rem',
  '--size-2': '2rem',
  '--fade-in': 'fade-in .5s ease',
  '--fade-in-@': '@keyframes fade-in {to { opacity: 1 }}',
  '--dark': '@custom-media --dark (prefers-color-scheme: dark);',
}

async function run (input, output, opts = { }) {
  let result = await postcss([plugin(opts)]).process(input, { from: undefined })
  expect(result.css).toEqual(output)
  expect(result.warnings()).toHaveLength(0)
}

it('Can jit a single prop', async () => {
  await run(
`a {
  color: var(--red);
}`, 
`:root {
  --red: #f00;
}
a {
  color: var(--red);
}`, 
  MockProps
  )
})

it('Can jit a single prop that has fallbacks', async () => {
  await run(
`a {
  color: var(--red, hotpink);
}`, 
`:root {
  --red: #f00;
}
a {
  color: var(--red, hotpink);
}`, 
  MockProps
  )
})

it('Can jit a single prop that has fallbacks and nested props', async () => {
  await run(
`a {
  color: var(--red, var(--pink), hotpink);
}`, 
`:root {
  --red: #f00;
  --pink: #ffc0cb;
}
a {
  color: var(--red, var(--pink), hotpink);
}`, 
  MockProps
  )
})

it('Can jit multiple props', async () => {
  await run(
`a {
  color: var(--red);
  border-color: var(--pink);
}`, 
`:root {
  --red: #f00;
  --pink: #ffc0cb;
}
a {
  color: var(--red);
  border-color: var(--pink);
}`, 
  MockProps
  )
})

it('Can jit multiple props from shorthand', async () => {
  await run(
`a {
  padding-block: var(--size-1) var(--size-2);
}`, 
`:root {
  --size-1: 1rem;
  --size-2: 2rem;
}
a {
  padding-block: var(--size-1) var(--size-2);
}`, 
  MockProps
  )
})

it('Can jit props from inside functions', async () => {
  await run(
`a {
  color: hsl(var(--h) var(--s) var(--l));
}`, 
`:root {
  --h: 200;
  --s: 50%;
  --l: 50%;
}
a {
  color: hsl(var(--h) var(--s) var(--l));
}`, 
  MockProps
  )
})

it('Only adds a prop one time to :root', async () => {
  await run(
`a {
  color: var(--red);
  border-color: var(--red);
}`, 
`:root {
  --red: #f00;
}
a {
  color: var(--red);
  border-color: var(--red);
}`, 
  MockProps
  )
})

it('Can jit a keyframe animation', async () => {
  await run(
`a {
  animation: var(--fade-in);
}`, 
`:root {
  --fade-in: fade-in .5s ease;
}a {
  animation: var(--fade-in);
}@keyframes fade-in {to { opacity: 1 }}`, 
  MockProps
  )
})

it('Can jit @custom-media', async () => {
  await run(
`@media (--dark) {
  a {
    color: white;
  }
}`, 
`@custom-media --dark (prefers-color-scheme: dark);
:root{}
@media (--dark) {
  a {
    color: white;
  }
}`, 
  MockProps
  )
})

it('Can jit props from JSON', async () => {
  await run(
`a {
  color: var(--red);
}`, 
`:root {
  --red: #f00;
}
a {
  color: var(--red);
}`, 
  { "--red": "#f00" }
  )
})

it('Can jit props from a CSS file', async () => {
  await run(
`@media (--dark) {
  a {
    color: var(--red);
    animation: var(--fade-in);
  }
}`, 
`@custom-media --dark (prefers-color-scheme: dark);
:root{
  --red: #f00;
  --fade-in: fade-in .5s ease;
}
@media (--dark) {
  a {
    color: var(--red);
    animation: var(--fade-in);
  }
}
@keyframes fade-in {to { opacity: 1 }}`, 
  { files: ['./props.test.css']}
  )
})

it('Can fail without srcProps options gracefully', async () => {
  console.warn = jest.fn()
  await postcss([plugin({})]).process(``, { from: undefined })

  expect(console.warn).toHaveBeenCalledWith('postcss-jit-props: Variable source(s) not passed.')
})