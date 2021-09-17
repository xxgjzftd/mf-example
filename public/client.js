(() => {
  // src/index.ts
  var relList = document.createElement("link").relList;
  var scriptRel = relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
  var seen = {};
  var cached = (fn) => {
    const cache = Object.create(null);
    return (string) => cache[string] || (cache[string] = fn(string));
  };
  var getDeps = cached((mn) => {
    let deps = [];
    const info = window.mf.modules[mn];
    deps.push(info.js);
    info.css && deps.push(info.css);
    info.imports.forEach((mn2) => {
      deps = deps.concat(getDeps(mn2));
    });
    return deps;
  });
  var mf = window.mf = window.mf || {};
  mf.load = function(mn) {
    const deps = getDeps(mn);
    return Promise.all(deps.map((dep) => {
      if (seen[dep])
        return;
      seen[dep] = true;
      const href = mf.base + dep;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      if (document.querySelector(`link[href="${href}"]${cssSelector}`)) {
        return;
      }
      const link = document.createElement("link");
      link.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) {
        link.as = "script";
        link.crossOrigin = "";
      }
      link.href = href;
      document.head.appendChild(link);
      if (isCss) {
        return new Promise((res, rej) => {
          link.addEventListener("load", res);
          link.addEventListener("error", rej);
        });
      }
    })).then(() => window.importShim(mn));
  };
  mf.unload = function(mn) {
    const deps = getDeps(mn);
    deps.filter((dep) => dep.endsWith(".css")).forEach((dep) => {
      if (seen[dep]) {
        seen[dep] = false;
        const href = mf.base + dep;
        const link = document.querySelector(`link[href="${href}"][rel="stylesheet"]`);
        link && link.remove();
      }
    });
  };
  var MFAppStatus;
  (function(MFAppStatus2) {
    MFAppStatus2[MFAppStatus2["NOT_LOADED"] = 0] = "NOT_LOADED";
    MFAppStatus2[MFAppStatus2["NOT_MOUNTED"] = 1] = "NOT_MOUNTED";
    MFAppStatus2[MFAppStatus2["MOUNTED"] = 2] = "MOUNTED";
  })(MFAppStatus || (MFAppStatus = {}));
  var apps = [];
  mf.register = function(name, predicate, load) {
    apps.push({
      name,
      predicate,
      load,
      status: 0
    });
  };
  var getApps = () => {
    const toBeMounted = [];
    const toBeUnmounted = [];
    apps.forEach((app) => {
      const shouldBeActive = app.predicate(location.pathname);
      switch (app.status) {
        case 0:
        case 1:
          shouldBeActive && toBeMounted.push(app);
          break;
        case 2:
          shouldBeActive || toBeUnmounted.push(app);
      }
    });
    return { toBeMounted, toBeUnmounted };
  };
  var route = async function() {
    const { toBeMounted, toBeUnmounted } = getApps();
    await Promise.all(toBeUnmounted.map(async (app) => {
      await app.unmount();
      return mf.unload(app.name);
    }));
    await Promise.all(toBeMounted.map(async (app) => {
      if (app.status === 0) {
        Object.assign(app, await app.load().then((m) => m.default));
        app.status = 1;
      }
      await app.mount();
      app.status = 2;
    }));
  };
  mf.start = route;
  window.addEventListener("popstate", route);
  var pushState = history.pushState;
  history.pushState = function(...args) {
    pushState(...args);
    route();
  };
})();
