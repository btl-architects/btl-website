import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser', fullyParallel:false, workers:1, timeout:45000,
  retries:process.env.CI ? 1 : 0,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:8788',trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'webkit',use:{...devices['Desktop Safari']}},{name:'firefox',use:{...devices['Desktop Firefox']}}],
  /* Never reuse a server already on the port. serve:test copies dist/ once, when
     it starts, so a server left running serves that build for as long as it
     lives — and a reused one had been answering local runs with a three-day-old
     copy, passing tests against code that no longer existed. A port already in
     use now fails the run, which says so, instead of quietly testing the past. */
  webServer:{command:'npm run serve:test',url:'http://127.0.0.1:8788/',reuseExistingServer:false,timeout:60000},
});
