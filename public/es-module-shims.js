/* ES Module Shims 0.12.1 */
(function () {
  const resolvedPromise = Promise.resolve();

  let baseUrl;

  function createBlob (source, type = 'text/javascript') {
    return URL.createObjectURL(new Blob([source], { type }));
  }

  const hasDocument = typeof document !== 'undefined';

  // support browsers without dynamic import support (eg Firefox 6x)
  let supportsDynamicImport = false;
  let supportsJsonAssertions = false;
  let dynamicImport;
  try {
    dynamicImport = (0, eval)('u=>import(u)');
    supportsDynamicImport = true;
  }
  catch (e) {
    if (hasDocument) {
      let err;
      self.addEventListener('error', e => err = e.error);
      dynamicImport = blobUrl => {
        const topLevelBlobUrl = createBlob(
          `import*as m from'${blobUrl}';self._esmsi=m;`
        );
        const s = document.createElement('script');
        s.type = 'module';
        s.src = topLevelBlobUrl;
        document.head.appendChild(s);
        return new Promise((resolve, reject) => {
          s.addEventListener('load', () => {
            document.head.removeChild(s);
            if (self._esmsi) {
              resolve(self._esmsi, baseUrl);
              self._esmsi = null;
            }
            else {
              reject(err);
            }
          });
        });
      };
    }
  }

  let supportsImportMeta = false;
  let supportsImportMaps = false;

  const featureDetectionPromise = Promise.all([
    dynamicImport(createBlob('import"data:text/json,{}"assert{type:"json"}')).then(() => supportsJsonAssertions = true, () => {}),
    dynamicImport(createBlob('import.meta')).then(() => supportsImportMeta = true, () => {}),
    supportsDynamicImport && hasDocument && new Promise(resolve => {
      self._$s = v => {
        document.body.removeChild(iframe);
        if (v) supportsImportMaps = true;
        delete self._$s;
        resolve();
      };
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.srcdoc = `<script type=importmap>{"imports":{"x":"data:text/javascript,"}}<${''}/script><script>import('x').then(()=>1,()=>0).then(v=>parent._$s(v))<${''}/script>`, 'text/html';
      document.body.appendChild(iframe);
    })
  ]);

  if (hasDocument) {
    const baseEl = document.querySelector('base[href]');
    if (baseEl)
      baseUrl = baseEl.href;
  }

  if (!baseUrl && typeof location !== 'undefined') {
    baseUrl = location.href.split('#')[0].split('?')[0];
    const lastSepIndex = baseUrl.lastIndexOf('/');
    if (lastSepIndex !== -1)
      baseUrl = baseUrl.slice(0, lastSepIndex + 1);
  }

  const backslashRegEx = /\\/g;
  function resolveIfNotPlainOrUrl (relUrl, parentUrl) {
    // strip off any trailing query params or hashes
    parentUrl = parentUrl && parentUrl.split('#')[0].split('?')[0];
    if (relUrl.indexOf('\\') !== -1)
      relUrl = relUrl.replace(backslashRegEx, '/');
    // protocol-relative
    if (relUrl[0] === '/' && relUrl[1] === '/') {
      return parentUrl.slice(0, parentUrl.indexOf(':') + 1) + relUrl;
    }
    // relative-url
    else if (relUrl[0] === '.' && (relUrl[1] === '/' || relUrl[1] === '.' && (relUrl[2] === '/' || relUrl.length === 2 && (relUrl += '/')) ||
        relUrl.length === 1  && (relUrl += '/')) ||
        relUrl[0] === '/') {
      const parentProtocol = parentUrl.slice(0, parentUrl.indexOf(':') + 1);
      // Disabled, but these cases will give inconsistent results for deep backtracking
      //if (parentUrl[parentProtocol.length] !== '/')
      //  throw new Error('Cannot resolve');
      // read pathname from parent URL
      // pathname taken to be part after leading "/"
      let pathname;
      if (parentUrl[parentProtocol.length + 1] === '/') {
        // resolving to a :// so we need to read out the auth and host
        if (parentProtocol !== 'file:') {
          pathname = parentUrl.slice(parentProtocol.length + 2);
          pathname = pathname.slice(pathname.indexOf('/') + 1);
        }
        else {
          pathname = parentUrl.slice(8);
        }
      }
      else {
        // resolving to :/ so pathname is the /... part
        pathname = parentUrl.slice(parentProtocol.length + (parentUrl[parentProtocol.length] === '/'));
      }

      if (relUrl[0] === '/')
        return parentUrl.slice(0, parentUrl.length - pathname.length - 1) + relUrl;

      // join together and split for removal of .. and . segments
      // looping the string instead of anything fancy for perf reasons
      // '../../../../../z' resolved to 'x/y' is just 'z'
      const segmented = pathname.slice(0, pathname.lastIndexOf('/') + 1) + relUrl;

      const output = [];
      let segmentIndex = -1;
      for (let i = 0; i < segmented.length; i++) {
        // busy reading a segment - only terminate on '/'
        if (segmentIndex !== -1) {
          if (segmented[i] === '/') {
            output.push(segmented.slice(segmentIndex, i + 1));
            segmentIndex = -1;
          }
        }

        // new segment - check if it is relative
        else if (segmented[i] === '.') {
          // ../ segment
          if (segmented[i + 1] === '.' && (segmented[i + 2] === '/' || i + 2 === segmented.length)) {
            output.pop();
            i += 2;
          }
          // ./ segment
          else if (segmented[i + 1] === '/' || i + 1 === segmented.length) {
            i += 1;
          }
          else {
            // the start of a new segment as below
            segmentIndex = i;
          }
        }
        // it is the start of a new segment
        else {
          segmentIndex = i;
        }
      }
      // finish reading out the last segment
      if (segmentIndex !== -1)
        output.push(segmented.slice(segmentIndex));
      return parentUrl.slice(0, parentUrl.length - pathname.length) + output.join('');
    }
  }

  /*
   * Import maps implementation
   *
   * To make lookups fast we pre-resolve the entire import map
   * and then match based on backtracked hash lookups
   *
   */
  function resolveUrl (relUrl, parentUrl) {
    return resolveIfNotPlainOrUrl(relUrl, parentUrl) || (relUrl.indexOf(':') !== -1 ? relUrl : resolveIfNotPlainOrUrl('./' + relUrl, parentUrl));
  }

  function resolveAndComposePackages (packages, outPackages, baseUrl, parentMap) {
    for (let p in packages) {
      const resolvedLhs = resolveIfNotPlainOrUrl(p, baseUrl) || p;
      let target = packages[p];
      if (typeof target !== 'string') 
        continue;
      const mapped = resolveImportMap(parentMap, resolveIfNotPlainOrUrl(target, baseUrl) || target, baseUrl);
      if (mapped) {
        outPackages[resolvedLhs] = mapped;
        continue;
      }
      targetWarning(p, packages[p], 'bare specifier did not resolve');
    }
  }

  function resolveAndComposeImportMap (json, baseUrl, parentMap) {
    const outMap = { imports: Object.assign({}, parentMap.imports), scopes: Object.assign({}, parentMap.scopes) };

    if (json.imports)
      resolveAndComposePackages(json.imports, outMap.imports, baseUrl, parentMap);

    if (json.scopes)
      for (let s in json.scopes) {
        const resolvedScope = resolveUrl(s, baseUrl);
        resolveAndComposePackages(json.scopes[s], outMap.scopes[resolvedScope] || (outMap.scopes[resolvedScope] = {}), baseUrl, parentMap);
      }

    return outMap;
  }

  function getMatch (path, matchObj) {
    if (matchObj[path])
      return path;
    let sepIndex = path.length;
    do {
      const segment = path.slice(0, sepIndex + 1);
      if (segment in matchObj)
        return segment;
    } while ((sepIndex = path.lastIndexOf('/', sepIndex - 1)) !== -1)
  }

  function applyPackages (id, packages) {
    const pkgName = getMatch(id, packages);
    if (pkgName) {
      const pkg = packages[pkgName];
      if (pkg === null) return;
      if (id.length > pkgName.length && pkg[pkg.length - 1] !== '/')
        targetWarning(pkgName, pkg, "should have a trailing '/'");
      else
        return pkg + id.slice(pkgName.length);
    }
  }

  function targetWarning (match, target, msg) {
    console.warn("Package target " + msg + ", resolving target '" + target + "' for " + match);
  }

  function resolveImportMap (importMap, resolvedOrPlain, parentUrl) {
    let scopeUrl = parentUrl && getMatch(parentUrl, importMap.scopes);
    while (scopeUrl) {
      const packageResolution = applyPackages(resolvedOrPlain, importMap.scopes[scopeUrl]);
      if (packageResolution)
        return packageResolution;
      scopeUrl = getMatch(scopeUrl.slice(0, scopeUrl.lastIndexOf('/')), importMap.scopes);
    }
    return applyPackages(resolvedOrPlain, importMap.imports) || resolvedOrPlain.indexOf(':') !== -1 && resolvedOrPlain;
  }

  /* es-module-lexer 0.6.0 */
  const A=1===new Uint8Array(new Uint16Array([1]).buffer)[0];function parse(E,g="@"){if(!B)return init.then(()=>parse(E));const I=E.length+1,w=(B.__heap_base.value||B.__heap_base)+4*I-B.memory.buffer.byteLength;w>0&&B.memory.grow(Math.ceil(w/65536));const D=B.sa(I-1);if((A?C:Q)(E,new Uint16Array(B.memory.buffer,D,I)),!B.parse())throw Object.assign(new Error(`Parse error ${g}:${E.slice(0,B.e()).split("\n").length}:${B.e()-E.lastIndexOf("\n",B.e()-1)}`),{idx:B.e()});const L=[],N=[];for(;B.ri();){const A=B.is(),Q=B.ie(),C=B.ai(),g=B.id(),I=B.ss(),w=B.se();let D;B.ip()&&(D=J(E.slice(-1===g?A-1:A,-1===g?Q+1:Q))),L.push({n:D,s:A,e:Q,ss:I,se:w,d:g,a:C});}for(;B.re();)N.push(E.slice(B.es(),B.ee()));function J(A){try{return (0,eval)(A)}catch{}}return [L,N,!!B.f()]}function Q(A,Q){const C=A.length;let B=0;for(;B<C;){const C=A.charCodeAt(B);Q[B++]=(255&C)<<8|C>>>8;}}function C(A,Q){const C=A.length;let B=0;for(;B<C;)Q[B]=A.charCodeAt(B++);}let B;const init=WebAssembly.compile((E="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","undefined"!=typeof Buffer?Buffer.from(E,"base64"):Uint8Array.from(atob(E),A=>A.charCodeAt(0)))).then(WebAssembly.instantiate).then(({exports:A})=>{B=A;});var E;

  let id = 0;
  const registry = {};
  if (self.ESMS_DEBUG) {
    self._esmsr = registry;
  }

  async function loadAll (load, seen) {
    if (load.b || seen[load.u])
      return;
    seen[load.u] = 1;
    await load.L;
    await Promise.all(load.d.map(dep => loadAll(dep, seen)));
    if (!load.n)
      load.n = load.d.some(dep => dep.n);
  }

  let waitingForImportMapsInterval;
  let firstTopLevelProcess = true;
  async function topLevelLoad (url, fetchOpts, source, nativelyLoaded) {
    // no need to even fetch if we have feature support
    await featureDetectionPromise;
    if (waitingForImportMapsInterval > 0) {
      clearTimeout(waitingForImportMapsInterval);
      waitingForImportMapsInterval = 0;
    }
    if (firstTopLevelProcess) {
      firstTopLevelProcess = false;
      processScripts();
    }
    await importMapPromise;
    // early analysis opt-out
    if (nativelyLoaded && supportsDynamicImport && supportsImportMeta && supportsImportMaps && !importMapSrcOrLazy) {
      // dont reexec inline for polyfills -> just return null
      return source && nativelyLoaded ? null : dynamicImport(source ? createBlob(source) : url);
    }
    await init;
    const load = getOrCreateLoad(url, fetchOpts, source);
    const seen = {};
    await loadAll(load, seen);
    lastLoad = undefined;
    resolveDeps(load, seen);
    if (source && !nativelyLoaded && !shimMode && !load.n) {
      const module = dynamicImport(createBlob(source));
      if (shouldRevokeBlobURLs) revokeObjectURLs(Object.keys(seen));
      return module;
    }
    const module = await dynamicImport(load.b);
    // if the top-level load is a shell, run its update function
    if (load.s) {
      (await dynamicImport(load.s)).u$_(module);
    }
    if (shouldRevokeBlobURLs) revokeObjectURLs(Object.keys(seen));
    return module;
  }

  function revokeObjectURLs(registryKeys) {
    let batch = 0;
    const keysLength = registryKeys.length;
    const schedule = self.requestIdleCallback ? self.requestIdleCallback : self.requestAnimationFrame;
    schedule(cleanup);
    function cleanup() {
      const batchStartIndex = batch * 100;
      if (batchStartIndex > keysLength) return
      for (const key of registryKeys.slice(batchStartIndex, batchStartIndex + 100)) {
        const load = registry[key];
        if (load) URL.revokeObjectURL(load.b);
      }
      batch++;
      schedule(cleanup);
    }
  }

  async function importShim (id, parentUrl = baseUrl, _assertion) {
    await featureDetectionPromise;
    // Make sure all the "in-flight" import maps are loaded and applied.
    await importMapPromise;
    return topLevelLoad(resolve(id, parentUrl).r || throwUnresolved(id, parentUrl), { credentials: 'same-origin' });
  }

  self.importShim = importShim;

  const meta = {};

  const edge = navigator.userAgent.match(/Edge\/\d\d\.\d+$/);

  async function importMetaResolve (id, parentUrl = this.url) {
    await importMapPromise;
    return resolve(id, `${parentUrl}`).r || throwUnresolved(id, parentUrl);
  }

  self._esmsm = meta;

  const esmsInitOptions = self.esmsInitOptions || {};
  delete self.esmsInitOptions;
  let shimMode = typeof esmsInitOptions.shimMode === 'boolean' ? esmsInitOptions.shimMode : !!esmsInitOptions.fetch || !!document.querySelector('script[type="module-shim"],script[type="importmap-shim"]');
  const fetchHook = esmsInitOptions.fetch || ((url, opts) => fetch(url, opts));
  const skip = esmsInitOptions.skip || /^https?:\/\/(cdn\.skypack\.dev|jspm\.dev)\//;
  const onerror = esmsInitOptions.onerror || ((e) => { throw e; });
  const shouldRevokeBlobURLs = esmsInitOptions.revokeBlobURLs;

  function urlJsString (url) {
    return `'${url.replace(/'/g, "\\'")}'`;
  }

  let lastLoad;
  function resolveDeps (load, seen) {
    if (load.b || !seen[load.u])
      return;
    seen[load.u] = 0;

    for (const dep of load.d)
      resolveDeps(dep, seen);

    // use direct native execution when possible
    // load.n is therefore conservative
    if (!shimMode && !load.n) {
      load.b = lastLoad = load.u;
      load.S = undefined;
      return;
    }

    const [imports] = load.a;

    // "execution"
    const source = load.S;

    // edge doesnt execute sibling in order, so we fix this up by ensuring all previous executions are explicit dependencies
    let resolvedSource = edge && lastLoad ? `import '${lastLoad}';` : '';  

    if (!imports.length) {
      resolvedSource += source;
    }
    else {
      // once all deps have loaded we can inline the dependency resolution blobs
      // and define this blob
      let lastIndex = 0, depIndex = 0;
      for (const { s: start, se: end, d: dynamicImportIndex } of imports) {
        // dependency source replacements
        if (dynamicImportIndex === -1) {
          const depLoad = load.d[depIndex++];
          let blobUrl = depLoad.b;
          if (!blobUrl) {
            // circular shell creation
            if (!(blobUrl = depLoad.s)) {
              blobUrl = depLoad.s = createBlob(`export function u$_(m){${
                depLoad.a[1].map(
                  name => name === 'default' ? `$_default=m.default` : `${name}=m.${name}`
                ).join(',')
              }}${
                depLoad.a[1].map(name =>
                  name === 'default' ? `let $_default;export{$_default as default}` : `export let ${name}`
                ).join(';')
              }\n//# sourceURL=${depLoad.r}?cycle`);
            }
          }
          // circular shell execution
          else if (depLoad.s) {
            resolvedSource += `${source.slice(lastIndex, start - 1)}/*${source.slice(start - 1, end)}*/${urlJsString(blobUrl)};import*as m$_${depIndex} from'${depLoad.b}';import{u$_ as u$_${depIndex}}from'${depLoad.s}';u$_${depIndex}(m$_${depIndex})`;
            lastIndex = end;
            depLoad.s = undefined;
            continue;
          }
          resolvedSource += `${source.slice(lastIndex, start - 1)}/*${source.slice(start - 1, end)}*/${urlJsString(blobUrl)}`;
          lastIndex = end;
        }
        // import.meta
        else if (dynamicImportIndex === -2) {
          meta[load.r] = { url: load.r, resolve: importMetaResolve };
          resolvedSource += `${source.slice(lastIndex, start)}self._esmsm[${urlJsString(load.r)}]`;
          lastIndex = end;
        }
        // dynamic import
        else {
          resolvedSource += `${source.slice(lastIndex, dynamicImportIndex + 6)}Shim(${source.slice(start, end)}, ${load.r && urlJsString(load.r)}`;
          lastIndex = end;
        }
      }

      resolvedSource += source.slice(lastIndex);
    }

    resolvedSource = resolvedSource.replace(/\/\/# sourceMappingURL=(.*)\s*$/, (match, url) => {
      return match.replace(url, new URL(url, load.r));
    });
    let hasSourceURL = false;
    resolvedSource = resolvedSource.replace(/\/\/# sourceURL=(.*)\s*$/, (match, url) => {
      hasSourceURL = true;
      return match.replace(url, new URL(url, load.r));
    });
    if (!hasSourceURL) {
      resolvedSource += '\n//# sourceURL=' + load.r;
    }

    load.b = lastLoad = createBlob(resolvedSource);
    load.S = undefined;
  }

  const jsContentType = /^(text|application)\/(x-)?javascript(;|$)/;
  const jsonContentType = /^application\/json(;|$)/;
  const cssContentType = /^text\/css(;|$)/;
  const wasmContentType = /^application\/wasm(;|$)/;

  const fetchOptsMap = new Map();

  function getOrCreateLoad (url, fetchOpts, source) {
    let load = registry[url];
    if (load)
      return load;

    load = registry[url] = {
      // url
      u: url,
      // response url
      r: undefined,
      // fetchPromise
      f: undefined,
      // source
      S: undefined,
      // linkPromise
      L: undefined,
      // analysis
      a: undefined,
      // deps
      d: undefined,
      // blobUrl
      b: undefined,
      // shellUrl
      s: undefined,
      // needsShim
      n: false
    };

    load.f = (async () => {
      if (!source) {
        // preload fetch options override fetch options (race)
        const res = await fetchHook(url, fetchOptsMap.get(url) || fetchOpts);
        if (!res.ok)
          throw new Error(`${res.status} ${res.statusText} ${res.url}`);
        load.r = res.url;
        const contentType = res.headers.get('content-type');
        if (jsContentType.test(contentType))
          source = await res.text();
        else if (jsonContentType.test(contentType))
          source = `export default ${await res.text()}`;
        else if (cssContentType.test(contentType))
          throw new Error('CSS modules not yet supported');
        else if (wasmContentType.test(contentType))
          throw new Error('WASM modules not yet supported');
        else
          throw new Error(`Unknown Content-Type "${contentType}"`);
      }
      try {
        load.a = parse(source, load.u);
      }
      catch (e) {
        console.warn(e);
        load.a = [[], []];
      }
      load.S = source;
      return load;
    })();

    load.L = load.f.then(async () => {
      let childFetchOpts = fetchOpts;
      load.d = await Promise.all(load.a[0].map(({ n, d, a }) => {
        if (d >= 0 && !supportsDynamicImport ||
            d === 2 && (!supportsImportMeta || source.slice(end, end + 8) === '.resolve') ||
            a && !supportsJsonAssertions)
          load.n = true;
        if (!n) return;
        const { r, m } = resolve(n, load.r || load.u);
        if (m && (!supportsImportMaps || importMapSrcOrLazy))
          load.n = true;
        if (d !== -1) return;
        if (!r)
          throwUnresolved(n, load.r || load.u);
        if (skip.test(r)) return { b: r };
        if (childFetchOpts.integrity)
          childFetchOpts = Object.assign({}, childFetchOpts, { integrity: undefined });
        return getOrCreateLoad(r, childFetchOpts).f;
      }).filter(l => l));
    });

    return load;
  }

  let importMap = { imports: {}, scopes: {} };
  let importMapSrcOrLazy = false;
  let importMapPromise = resolvedPromise;

  if (hasDocument) {
    processScripts();
    waitingForImportMapsInterval = setInterval(processScripts, 20);
  }

  async function processScripts () {
    if (waitingForImportMapsInterval > 0 && document.readyState !== 'loading') {
      clearTimeout(waitingForImportMapsInterval);
      waitingForImportMapsInterval = 0;
    }
    for (const link of document.querySelectorAll('link[rel="modulepreload"]'))
      processPreload(link);
    for (const script of document.querySelectorAll('script[type="module-shim"],script[type="importmap-shim"],script[type="module"],script[type="importmap"]'))
      await processScript(script);
  }

  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'SCRIPT' && node.type)
          processScript(node, !firstTopLevelProcess);
        else if (node.tagName === 'LINK' && node.rel === 'modulepreload')
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });

  function getFetchOpts (script) {
    const fetchOpts = {};
    if (script.integrity)
      fetchOpts.integrity = script.integrity;
    if (script.referrerpolicy)
      fetchOpts.referrerPolicy = script.referrerpolicy;
    if (script.crossorigin === 'use-credentials')
      fetchOpts.credentials = 'include';
    else if (script.crossorigin === 'anonymous')
      fetchOpts.credentials = 'omit';
    else
      fetchOpts.credentials = 'same-origin';
    return fetchOpts;
  }

  async function processScript (script, dynamic) {
    if (script.ep) // ep marker = script processed
      return;
    const shim = script.type.endsWith('-shim');
    if (shim) shimMode = true;
    const type = shim ? script.type.slice(0, -5) : script.type;
    if (!shim && shimMode || script.getAttribute('noshim') !== null)
      return;
    // empty inline scripts sometimes show before domready
    if (!script.src && !script.innerHTML)
      return;
    script.ep = true;
    if (type === 'module') {
      await topLevelLoad(script.src || `${baseUrl}?${id++}`, getFetchOpts(script), !script.src && script.innerHTML, !shim).catch(onerror);
    }
    else if (type === 'importmap') {
      importMapPromise = importMapPromise.then(async () => {
        if (script.src || dynamic)
          importMapSrcOrLazy = true;
        importMap = resolveAndComposeImportMap(script.src ? await (await fetchHook(script.src)).json() : JSON.parse(script.innerHTML), script.src || baseUrl, importMap);
      });
    }
  }

  function processPreload (link) {
    if (link.ep) // ep marker = processed
      return;
    link.ep = true;
    // prepopulate the load record
    const fetchOpts = getFetchOpts(link);
    // save preloaded fetch options for later load  
    fetchOptsMap.set(link.href, fetchOpts);
    fetch(link.href, fetchOpts);
  }

  function resolve (id, parentUrl) {
    const urlResolved = resolveIfNotPlainOrUrl(id, parentUrl);
    const resolved = resolveImportMap(importMap, urlResolved || id, parentUrl);
    return { r: resolved, m: urlResolved !== resolved };
  }

  function throwUnresolved (id, parentUrl) {
    throw Error("Unable to resolve specifier '" + id + (parentUrl ? "' from " + parentUrl : "'"));
  }

}());