import execa from 'execa'

const res = execa.sync('git', ['diff', 'b12a3efdfb51428ba96affd65a2c0692767cfd80', 'HEAD', '--name-only'])
console.log(res)
